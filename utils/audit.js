const sequelize = require("./sequelize");
const { DataTypes } = require("sequelize");

let AuditLog = null;

const initializeAuditLog = () => {
  if (!AuditLog) {
    try {
      AuditLog = require("../models/auditLog")(sequelize, DataTypes);
    } catch (err) {
      console.error("Failed to initialize AuditLog model:", err.message);
    }
  }
};

const logEvent = async (data) => {
  try {
    initializeAuditLog();

    if (!AuditLog) {
      console.warn("AuditLog model not available. Skipping audit log.");
      return null;
    }

    const log = await AuditLog.create({
      userId: data.userId || null,
      action: data.action,
      resource: data.resource || null,
      status: data.status,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
    });

    return log;
  } catch (err) {
    console.error("Audit logging error:", err.message);
    return null;
  }
};

const logLogin = async (userId, status, req, metadata = {}) => {
  return await logEvent({
    userId,
    action: "LOGIN",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
    metadata,
  });
};

const logLogout = async (userId, req) => {
  return await logEvent({
    userId,
    action: "LOGOUT",
    status: "SUCCESS",
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const logRegistration = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "REGISTER",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const logPasswordReset = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "PASSWORD_RESET",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const logPasswordChange = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "PASSWORD_CHANGE",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const log2FAEnable = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "2FA_ENABLE",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const log2FADisable = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "2FA_DISABLE",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const logEmailVerification = async (userId, status, req) => {
  return await logEvent({
    userId,
    action: "EMAIL_VERIFY",
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

const logOAuthLogin = async (userId, provider, status, req) => {
  return await logEvent({
    userId,
    action: "OAUTH_LOGIN",
    resource: provider,
    status,
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.get("user-agent"),
  });
};

module.exports = {
  logEvent,
  logLogin,
  logLogout,
  logRegistration,
  logPasswordReset,
  logPasswordChange,
  log2FAEnable,
  log2FADisable,
  logEmailVerification,
  logOAuthLogin,
};
