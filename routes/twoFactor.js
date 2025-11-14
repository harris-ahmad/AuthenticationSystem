const express = require("express");
const router = express.Router();
const twoFactor = require("../utils/twoFactor");
const jwt = require("../utils/jwt");
const audit = require("../utils/audit");
const db = require("../common/db");
const { isAuthenticated } = require("../middleware/auth");
const { twoFactorLimiter } = require("../middleware/rateLimiter");
const {
  twoFactorSetupValidation,
  twoFactorVerifyValidation,
  handleValidationErrors,
} = require("../middleware/validation");

router.post("/setup", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await db.findById("User", userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA is already enabled",
      });
    }

    const secret = twoFactor.generateSecret(user.username);
    const qrCode = await twoFactor.generateQRCode(secret.otpauth_url);
    const backupCodes = twoFactor.generateBackupCodes();

    await db.update("User", { id: user.id }, { twoFactorSecret: secret.base32 });

    res.status(200).json({
      success: true,
      message: "2FA setup initiated. Verify with your authenticator app to complete setup.",
      secret: secret.base32,
      qrCode,
      backupCodes,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/verify-setup",
  isAuthenticated,
  twoFactorLimiter,
  twoFactorSetupValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const userId = req.user.id;

      const user = await db.findById("User", userId);

      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          message: "2FA setup not initiated",
        });
      }

      const isValid = twoFactor.verifyToken(token, user.twoFactorSecret);

      if (!isValid) {
        await audit.log2FAEnable(userId, "FAILED", req);
        return res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }

      await db.update("User", { id: user.id }, { twoFactorEnabled: true });

      await audit.log2FAEnable(userId, "SUCCESS", req);

      res.status(200).json({
        success: true,
        message: "2FA enabled successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/verify",
  twoFactorLimiter,
  twoFactorVerifyValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token, tempToken } = req.body;

      if (!tempToken) {
        return res.status(400).json({
          success: false,
          message: "Temporary token required",
        });
      }

      let decoded;
      try {
        decoded = jwt.verifyAccessToken(tempToken);
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid temporary token",
        });
      }

      const user = await db.findById("User", decoded.id);

      if (!user || !user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          message: "2FA not enabled for this account",
        });
      }

      const isValid = twoFactor.verifyToken(token, user.twoFactorSecret);

      if (!isValid) {
        await audit.logLogin(user.id, "FAILED_2FA", req);
        return res.status(400).json({
          success: false,
          message: "Invalid 2FA code",
        });
      }

      const accessToken = jwt.generateAccessToken({ ...user.toJSON(), twoFactorVerified: true });
      const refreshToken = jwt.generateRefreshToken();
      const expiresAt = jwt.calculateTokenExpiry(jwt.REFRESH_TOKEN_EXPIRES_IN);

      await db.create("RefreshToken", {
        userId: user.id,
        token: refreshToken,
        expiresAt,
        ipAddress: req.ip || req.connection?.remoteAddress,
        deviceInfo: { userAgent: req.get("user-agent") },
      });

      await audit.logLogin(user.id, "SUCCESS", req);

      res.status(200).json({
        success: true,
        message: "2FA verification successful",
        accessToken,
        refreshToken,
        user: user.toJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/disable", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await db.findById("User", userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: "2FA is not enabled",
      });
    }

    await db.update("User", { id: user.id }, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    await audit.log2FADisable(userId, "SUCCESS", req);

    res.status(200).json({
      success: true,
      message: "2FA disabled successfully",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
