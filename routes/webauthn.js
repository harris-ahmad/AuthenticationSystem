const express = require("express");
const router = express.Router();
const webauthn = require("../utils/webauthn");
const jwt = require("../utils/jwt");
const audit = require("../utils/audit");
const riskEngine = require("../utils/riskEngine");
const deviceFingerprinting = require("../utils/deviceFingerprinting");
const db = require("../common/db");
const { isAuthenticated } = require("../middleware/auth");

router.post("/register/options", isAuthenticated, async (req, res, next) => {
  try {
    const user = await db.findById("User", req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    //for general testing, we will use vs code's live server extension which serves on localhost:5500
    const requestOrigin = req.get('origin') || req.get('referer') || '';
    if (requestOrigin.includes('127.0.0.1')) {
      return res.status(400).json({
        success: false,
        message: "WebAuthn requires using 'localhost' instead of '127.0.0.1'. Please access the application at http://localhost:5500",
      });
    }

    const existingCredentials = await db.findMany("WebAuthnCredential", { userId: user.id });

    const options = await webauthn.createRegistrationOptions(user, existingCredentials, requestOrigin);

    res.status(200).json({
      success: true,
      options,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/register/verify", isAuthenticated, async (req, res, next) => {
  try {
    const { response, credentialName } = req.body;
    const user = await db.findById("User", req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const verification = await webauthn.verifyRegistration(user, response);

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        message: "Verification failed",
      });
    }

    const { registrationInfo } = verification;

    const credential = await db.create("WebAuthnCredential", {
      userId: user.id,
      credentialID: registrationInfo.credential.id,
      credentialPublicKey: Buffer.from(registrationInfo.credential.publicKey).toString("base64"),
      counter: registrationInfo.credential.counter,
      credentialDeviceType: registrationInfo.credentialDeviceType,
      credentialBackedUp: registrationInfo.credentialBackedUp,
      transports: registrationInfo.credential.transports || [],
      aaguid: registrationInfo.aaguid ? Buffer.from(registrationInfo.aaguid).toString("hex") : null,
      name: credentialName || "Passkey",
    });

    await audit.logEvent({
      userId: user.id,
      action: "WEBAUTHN_REGISTER",
      status: "SUCCESS",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    res.status(201).json({
      success: true,
      message: "Passkey registered successfully",
      credential: {
        id: credential.id,
        name: credential.name,
        createdAt: credential.createdAt,
      },
    });
  } catch (err) {
    await audit.logEvent({
      userId: req.user?.id,
      action: "WEBAUTHN_REGISTER",
      status: "FAILED",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      metadata: { error: err.message },
    });
    next(err);
  }
});

router.post("/login/options", async (req, res, next) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const user = await db.findOne("User", { username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const credentials = await db.findMany("WebAuthnCredential", { userId: user.id });

    if (credentials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No passkeys registered for this user",
      });
    }

    const options = await webauthn.createAuthenticationOptions(credentials);

    webauthn.storeChallenge(`login_${user.id}`, options.challenge);

    res.status(200).json({
      success: true,
      options,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login/verify", async (req, res, next) => {
  try {
    const { response, username } = req.body;

    if (!username || !response) {
      return res.status(400).json({
        success: false,
        message: "Username and response are required",
      });
    }

    const user = await db.findOne("User", { username });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }

    const credentialID = response.id; // This is base64url string
    const credential = await db.findOne("WebAuthnCredential", {
      userId: user.id,
      credentialID: credentialID,
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: "Credential not found",
      });
    }

    const challenge = webauthn.getChallenge(`login_${user.id}`);

    if (!challenge) {
      return res.status(400).json({
        success: false,
        message: "Challenge not found or expired",
      });
    }

    const authenticatorData = {
      credentialID: credential.credentialID,
      credentialPublicKey: credential.credentialPublicKey,
      counter: credential.counter,
    };

    const verification = await webauthn.verifyAuthentication(authenticatorData, response, challenge);

    if (!verification.verified) {
      await riskEngine.logLoginAttempt(user.id, username, req, false, "webauthn_verification_failed", null);
      return res.status(401).json({
        success: false,
        message: "Authentication failed",
      });
    }

    webauthn.deleteChallenge(`login_${user.id}`);

    await db.update("WebAuthnCredential", { id: credential.id }, {
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    });

    const riskAssessment = await riskEngine.assessRisk(user.id, req);
    riskAssessment.riskScore = Math.max(0, riskAssessment.riskScore - 20);
    riskAssessment.riskLevel = riskAssessment.riskScore <= 30 ? "low" : riskAssessment.riskLevel;

    // Trust device after successful WebAuthn login
    const fingerprint = deviceFingerprinting.generateFingerprint(req);
    const ipAddress = req.ip || req.connection?.remoteAddress;
    await deviceFingerprinting.trustDevice(user.id, fingerprint, ipAddress, req);

    const accessToken = jwt.generateAccessToken(user);
    const refreshToken = jwt.generateRefreshToken();
    const expiresAt = jwt.calculateTokenExpiry(jwt.REFRESH_TOKEN_EXPIRES_IN);

    await db.create("RefreshToken", {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip || req.connection?.remoteAddress,
      deviceInfo: { userAgent: req.get("user-agent"), webauthn: true },
    });

    await db.update("User", { id: user.id }, {
      lastLoginAt: new Date(),
      lastLoginIp: req.ip || req.connection?.remoteAddress,
    });

    await riskEngine.logLoginAttempt(user.id, username, req, true, null, riskAssessment);
    await audit.logEvent({
      userId: user.id,
      action: "WEBAUTHN_LOGIN",
      status: "SUCCESS",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: user.toJSON(),
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/credentials", isAuthenticated, async (req, res, next) => {
  try {
    const credentials = await db.findMany("WebAuthnCredential", { userId: req.user.id }, {
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      credentials,
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/credentials/:id", isAuthenticated, async (req, res, next) => {
  try {
    const credential = await db.findOne("WebAuthnCredential", {
      id: req.params.id,
      userId: req.user.id,
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    await db.delete("WebAuthnCredential", {
      id: req.params.id,
      userId: req.user.id,
    });

    await audit.logEvent({
      userId: req.user.id,
      action: "WEBAUTHN_CREDENTIAL_DELETE",
      status: "SUCCESS",
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      metadata: { credentialId: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Credential removed",
    });
  } catch (err) {
    next(err);
  }
});

router.patch("/credentials/:id", isAuthenticated, async (req, res, next) => {
  try {
    const { name } = req.body;

    const credential = await db.findOne("WebAuthnCredential", {
      id: req.params.id,
      userId: req.user.id,
    });

    if (!credential) {
      return res.status(404).json({
        success: false,
        message: "Credential not found",
      });
    }

    if (name) {
      await db.update("WebAuthnCredential", {
        id: req.params.id,
        userId: req.user.id,
      }, { name });
    }

    res.status(200).json({
      success: true,
      message: "Credential updated",
      credential: {
        id: credential.id,
        name: credential.name,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
