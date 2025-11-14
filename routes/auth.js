const express = require("express");
const router = express.Router();
const passport = require("passport");
const crypto = require("crypto");
const bcrypt = require("../utils/bcrypt");
const jwt = require("../utils/jwt");
const twoFactor = require("../utils/twoFactor");
const email = require("../utils/email");
const audit = require("../utils/audit");
const riskEngine = require("../utils/riskEngine");
const deviceFingerprinting = require("../utils/deviceFingerprinting");
const db = require("../common/db");

const {
  registerValidation,
  loginValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  emailVerificationValidation,
  changePasswordValidation,
  handleValidationErrors,
} = require("../middleware/validation");

const {
  registerLimiter,
  loginLimiter,
  passwordResetLimiter,
  emailVerificationLimiter,
} = require("../middleware/rateLimiter");

const { isAuthenticated } = require("../middleware/auth");

router.post("/register", registerLimiter, registerValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const { username, email: userEmail, password } = req.body;

    const existingByUsername = await db.findOne("User", { username });
    const existingByEmail = userEmail ? await db.findOne("User", { email: userEmail }) : null;

    if (existingByUsername || existingByEmail) {
      await audit.logRegistration(null, "FAILED", req);
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hashPassword(password);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await db.create("User", {
      username,
      email: userEmail || null,
      password: hashedPassword,
      emailVerificationToken: userEmail ? emailVerificationToken : null,
      emailVerificationExpires: userEmail ? emailVerificationExpires : null,
      emailVerified: !userEmail,
    });

    if (userEmail) {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      await email.sendVerificationEmail(userEmail, username, emailVerificationToken, baseUrl);
    }

    await audit.logRegistration(user.id, "SUCCESS", req);

    res.status(201).json({
      success: true,
      message: userEmail
        ? "Registration successful. Please check your email to verify your account."
        : "Registration successful",
      user: user.toJSON(),
    });
  } catch (err) {
    await audit.logRegistration(null, "ERROR", req);
    next(err);
  }
});

router.post("/login", loginLimiter, loginValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await db.findOne("User", { username });

    if (!user) {
      await audit.logLogin(null, "FAILED", req, { reason: "user_not_found" });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      await audit.logLogin(user.id, "FAILED", req, { reason: "account_locked" });
      return res.status(423).json({
        success: false,
        message: "Account is temporarily locked. Please try again later.",
      });
    }

    if (!user.active) {
      await audit.logLogin(user.id, "FAILED", req, { reason: "account_inactive" });
      return res.status(403).json({ success: false, message: "Account is inactive" });
    }

    const isMatch = await bcrypt.comparePassword(password, user.password);

    if (!isMatch) {
      const updates = {
        failedLoginAttempts: user.failedLoginAttempts + 1,
      };
      if (user.failedLoginAttempts + 1 >= 5) {
        updates.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await db.update("User", { id: user.id }, updates);
      await audit.logLogin(user.id, "FAILED", req, { reason: "invalid_password" });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    await db.update("User", { id: user.id }, {
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: req.ip || req.connection?.remoteAddress,
    });

    if (user.twoFactorEnabled) {
      const tempToken = jwt.generateAccessToken({ ...user.toJSON(), twoFactorVerified: false });
      await audit.logLogin(user.id, "PENDING_2FA", req);
      return res.status(200).json({
        success: true,
        message: "2FA verification required",
        requiresTwoFactor: true,
        tempToken,
      });
    }

    const accessToken = jwt.generateAccessToken(user);
    const refreshToken = jwt.generateRefreshToken();
    const expiresAt = jwt.calculateTokenExpiry(jwt.REFRESH_TOKEN_EXPIRES_IN);

    await db.create("RefreshToken", {
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: req.ip || req.connection?.remoteAddress,
      deviceInfo: { userAgent: req.get("user-agent") },
    });

    req.logIn(user, (err) => {
      if (err) console.error("Session login error:", err);
    });

    await audit.logLogin(user.id, "SUCCESS", req);

    res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      refreshToken,
      user: user.toJSON(),
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", isAuthenticated, async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      const token = jwt.getTokenFromRequest(req);
      if (token) {
        await db.update("RefreshToken", { userId }, { isRevoked: true });
      }
      await audit.logLogout(userId, req);
    }

    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.status(200).json({ success: true, message: "Logout successful" });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    const tokenRecord = await db.findOne("RefreshToken", { token: refreshToken, isRevoked: false });

    if (!tokenRecord || tokenRecord.isExpired()) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = await db.findById("User", tokenRecord.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const newAccessToken = jwt.generateAccessToken(user);

    res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/verify-email",
  emailVerificationLimiter,
  emailVerificationValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token } = req.body;

      const user = await db.findOne("User", { emailVerificationToken: token });

      if (!user || !user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
        await audit.logEmailVerification(null, "FAILED", req);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      await db.update("User", { id: user.id }, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      await audit.logEmailVerification(user.id, "SUCCESS", req);

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/request-password-reset",
  passwordResetLimiter,
  passwordResetRequestValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { email: userEmail } = req.body;

      const user = await db.findOne("User", { email: userEmail });

      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await db.update("User", { id: user.id }, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      await email.sendPasswordResetEmail(userEmail, user.username, resetToken, baseUrl);

      await audit.logPasswordReset(user.id, "REQUESTED", req);

      res.status(200).json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/reset-password",
  passwordResetValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { token, password } = req.body;

      const user = await db.findOne("User", { passwordResetToken: token });

      if (!user || !user.passwordResetExpires || user.passwordResetExpires <= new Date()) {
        await audit.logPasswordReset(null, "FAILED", req);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      const hashedPassword = await bcrypt.hashPassword(password);

      await db.update("User", { id: user.id }, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      });

      await db.update("RefreshToken", { userId: user.id }, { isRevoked: true });

      if (user.email) {
        await email.sendPasswordChangedEmail(user.email, user.username);
      }

      await audit.logPasswordReset(user.id, "SUCCESS", req);

      res.status(200).json({
        success: true,
        message: "Password reset successful",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/change-password",
  isAuthenticated,
  changePasswordValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await db.findById("User", userId);

      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.comparePassword(currentPassword, user.password);

      if (!isMatch) {
        await audit.logPasswordChange(userId, "FAILED", req);
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await bcrypt.hashPassword(newPassword);

      await db.update("User", { id: user.id }, { password: hashedPassword });

      await db.update("RefreshToken", { userId: user.id }, { isRevoked: true });

      if (user.email) {
        await email.sendPasswordChangedEmail(user.email, user.username);
      }

      await audit.logPasswordChange(userId, "SUCCESS", req);

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", isAuthenticated, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
