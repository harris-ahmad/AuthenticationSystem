const express = require("express");
const router = express.Router();
const passport = require("passport");
const crypto = require("crypto");
const bcrypt = require("../utils/bcrypt");
const jwt = require("../utils/jwt");
const twoFactor = require("../utils/twoFactor");
const email = require("../utils/email");
const audit = require("../utils/audit");
const sequelize = require("../utils/sequelize");
const { DataTypes } = require("sequelize");

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

let User, RefreshToken;

const initializeModels = () => {
  if (!User) User = require("../models/user")(sequelize, DataTypes);
  if (!RefreshToken) RefreshToken = require("../models/refreshToken")(sequelize, DataTypes);
};

router.post("/register", registerLimiter, registerValidation, handleValidationErrors, async (req, res, next) => {
  try {
    initializeModels();
    const { username, email: userEmail, password } = req.body;

    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username },
          ...(userEmail ? [{ email: userEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      await audit.logRegistration(null, "FAILED", req);
      return res.status(400).json({
        success: false,
        message: "Username or email already exists",
      });
    }

    const hashedPassword = await bcrypt.hashPassword(password);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
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
    initializeModels();
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });

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
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      await audit.logLogin(user.id, "FAILED", req, { reason: "invalid_password" });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.connection?.remoteAddress;
    await user.save();

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

    await RefreshToken.create({
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
    initializeModels();
    const userId = req.user?.id;

    if (userId) {
      const token = jwt.getTokenFromRequest(req);
      if (token) {
        await RefreshToken.update({ isRevoked: true }, { where: { userId } });
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
    initializeModels();
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token required" });
    }

    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken, isRevoked: false },
      include: [{ model: User, as: "user" }],
    });

    if (!tokenRecord || tokenRecord.isExpired()) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = tokenRecord.user;
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
      initializeModels();
      const { token } = req.body;

      const user = await User.findOne({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: { [sequelize.Sequelize.Op.gt]: new Date() },
        },
      });

      if (!user) {
        await audit.logEmailVerification(null, "FAILED", req);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }

      user.emailVerified = true;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
      await user.save();

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
      initializeModels();
      const { email: userEmail } = req.body;

      const user = await User.findOne({ where: { email: userEmail } });

      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save();

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
      initializeModels();
      const { token, password } = req.body;

      const user = await User.findOne({
        where: {
          passwordResetToken: token,
          passwordResetExpires: { [sequelize.Sequelize.Op.gt]: new Date() },
        },
      });

      if (!user) {
        await audit.logPasswordReset(null, "FAILED", req);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      const hashedPassword = await bcrypt.hashPassword(password);
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.failedLoginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();

      await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id } });

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
      initializeModels();
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await User.findByPk(userId);

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
      user.password = hashedPassword;
      await user.save();

      await RefreshToken.update({ isRevoked: true }, { where: { userId: user.id } });

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
