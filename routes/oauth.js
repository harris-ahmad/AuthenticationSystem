const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("../utils/jwt");
const audit = require("../utils/audit");
const db = require("../common/db");
const { oauthLimiter } = require("../middleware/rateLimiter");

router.get("/google", oauthLimiter, passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), async (req, res, next) => {
  try {
    const user = req.user;

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

    await audit.logOAuthLogin(user.id, "google", "SUCCESS", req);

    const redirectUrl = process.env.OAUTH_REDIRECT_URL || "/";
    res.redirect(`${redirectUrl}?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err) {
    next(err);
  }
});

router.get("/github", oauthLimiter, passport.authenticate("github", { scope: ["user:email"] }));

router.get("/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), async (req, res, next) => {
  try {
    const user = req.user;

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

    await audit.logOAuthLogin(user.id, "github", "SUCCESS", req);

    const redirectUrl = process.env.OAUTH_REDIRECT_URL || "/";
    res.redirect(`${redirectUrl}?token=${accessToken}&refreshToken=${refreshToken}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
