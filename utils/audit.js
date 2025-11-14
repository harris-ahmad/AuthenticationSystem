const { isConnected } = require("./database");
const db = require("../common/db");

const logEvent = async (data) => {
  try {
    if (!isConnected()) {
      console.warn("Database not connected. Skipping audit log.");
      return null;
    }

    const log = await db.create("AuditLog", {
      userId: data.userId || null,
      action: data.action,
      resource: data.resource || null,
      status: data.status,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
    })

    return log;
  } catch (err) {
    console.error("Audit logging error:", err);
    return null;
  }
};

const createAuditLogger = (action, defaultStatus = null) => {
  return async (userId, statusOrReq, reqOrMetadata = {}, metadata = {}) => {
    let status, req, actualMetadata;
    
    if (typeof statusOrReq === 'object' && (statusOrReq.ip || statusOrReq.get)) {
      req = statusOrReq;
      status = defaultStatus || "SUCCESS";
      actualMetadata = reqOrMetadata;
    } else {
      status = statusOrReq;
      req = reqOrMetadata;
      actualMetadata = metadata;
    }

    return await logEvent({
      userId,
      action,
      status,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      metadata: actualMetadata,
    });
  };
};

const createOAuthLogger = () => {
  return async (userId, provider, status, req) => {
    return await logEvent({
      userId,
      action: "OAUTH_LOGIN",
      resource: provider,
      status,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
    });
  };
};

const logLogin = createAuditLogger("LOGIN");
const logLogout = createAuditLogger("LOGOUT", "SUCCESS");
const logRegistration = createAuditLogger("REGISTER");
const logPasswordReset = createAuditLogger("PASSWORD_RESET");
const logPasswordChange = createAuditLogger("PASSWORD_CHANGE");
const log2FAEnable = createAuditLogger("2FA_ENABLE");
const log2FADisable = createAuditLogger("2FA_DISABLE");
const logEmailVerification = createAuditLogger("EMAIL_VERIFY");
const logOAuthLogin = createOAuthLogger();

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
