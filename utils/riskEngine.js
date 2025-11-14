const deviceFingerprinting = require("./deviceFingerprinting");
const geolocation = require("./geolocation");
const velocityChecker = require("./velocityChecker");
const { getDatabaseType, isConnected } = require("./database");
const db = require("../common/db");

const getDbType = () => {
  if (!isConnected()) {
    throw new Error("Database not connected");
  }
  return getDatabaseType();
};

const DEFAULT_CONFIG = {
  weights: {
    newDevice: 25,
    newLocation: 20,
    impossibleTravel: 40,
    highRiskCountry: 15,
    suspiciousVelocity: 30,
    unusualTime: 10,
  },
  thresholds: {
    low: 30,
    medium: 60,
    high: 80,
  },
};

const assessRisk = async (userId, req, config = DEFAULT_CONFIG) => {
  const dbType = getDbType();

  const ipAddress = req.ip || req.connection?.remoteAddress;
  const fingerprint = deviceFingerprinting.generateFingerprint(req);
  const currentLocation = geolocation.getLocationFromIP(ipAddress);

  const riskFactors = {};
  let totalRiskScore = 0;

  const isKnown = await deviceFingerprinting.isKnownDevice(userId, fingerprint);
  riskFactors.newDevice = !isKnown;
  if (riskFactors.newDevice) {
    totalRiskScore += config.weights.newDevice;
  }

  const lastLoginResults = await db.findMany(
    "LoginHistory",
    { userId, success: true },
    {
      order: [["timestamp", "DESC"]],
      sort: { timestamp: -1 },
      limit: 1,
    }
  );
  const lastLogin = lastLoginResults.length > 0 ? lastLoginResults[0] : null;

  if (lastLogin && lastLogin.location) {
    const isSameCountry = lastLogin.location.country === currentLocation.country;
    riskFactors.newLocation = !isSameCountry;

    if (riskFactors.newLocation) {
      totalRiskScore += config.weights.newLocation;
    }

    const timeDiff = (Date.now() - new Date(lastLogin.timestamp).getTime()) / 1000 / 60;
    const travelCheck = geolocation.detectImpossibleTravel(lastLogin, currentLocation, timeDiff);

    riskFactors.impossibleTravel = travelCheck.impossible;
    riskFactors.travelDetails = travelCheck;

    if (travelCheck.impossible) {
      totalRiskScore += config.weights.impossibleTravel;
    }
  } else {
    riskFactors.newLocation = false;
    riskFactors.impossibleTravel = false;
  }

  riskFactors.highRiskCountry = geolocation.isHighRiskCountry(currentLocation.country);
  if (riskFactors.highRiskCountry) {
    totalRiskScore += config.weights.highRiskCountry;
  }

  const velocityCheck = await velocityChecker.checkLoginVelocity(userId, ipAddress);
  const ipVelocityCheck = await velocityChecker.checkIPVelocity(ipAddress);

  riskFactors.velocity = velocityCheck;
  riskFactors.ipVelocity = ipVelocityCheck;
  riskFactors.suspiciousVelocity = velocityCheck.suspicious || ipVelocityCheck.suspicious;

  if (riskFactors.suspiciousVelocity) {
    totalRiskScore += config.weights.suspiciousVelocity;
  }

  const currentHour = new Date().getHours();
  riskFactors.unusualTime = currentHour < 6 || currentHour > 23;
  if (riskFactors.unusualTime) {
    totalRiskScore += config.weights.unusualTime;
  }

  totalRiskScore = Math.min(100, totalRiskScore);

  let riskLevel;
  let decision;

  if (totalRiskScore <= config.thresholds.low) {
    riskLevel = "low";
    decision = "ALLOW";
  } else if (totalRiskScore <= config.thresholds.medium) {
    riskLevel = "medium";
    decision = "REQUIRE_EMAIL_VERIFICATION";
  } else if (totalRiskScore <= config.thresholds.high) {
    riskLevel = "high";
    decision = "REQUIRE_2FA";
  } else {
    riskLevel = "critical";
    decision = "BLOCK";
  }

  const assessment = {
    riskScore: totalRiskScore,
    riskLevel,
    decision,
    factors: riskFactors,
    location: currentLocation,
    deviceFingerprint: fingerprint,
    timestamp: new Date(),
  };

  await db.create("RiskAssessment", {
    userId,
    action: "LOGIN_ATTEMPT",
    ipAddress,
    deviceFingerprint: fingerprint,
    riskScore: totalRiskScore,
    riskLevel,
    factors: riskFactors,
    decision,
    metadata: {
      location: currentLocation,
      deviceInfo: deviceFingerprinting.parseDeviceInfo(req),
    },
  });

  return assessment;
};

const logLoginAttempt = async (userId, username, req, success, failureReason, riskAssessment) => {
  const ipAddress = req.ip || req.connection?.remoteAddress;
  const fingerprint = deviceFingerprinting.generateFingerprint(req);
  const location = geolocation.getLocationFromIP(ipAddress);

  await db.create("LoginHistory", {
    userId,
    username,
    ipAddress,
    userAgent: req.get("user-agent"),
    deviceFingerprint: fingerprint,
    location,
    success,
    failureReason,
    riskScore: riskAssessment?.riskScore || null,
    riskFactors: riskAssessment?.factors || null,
    actionTaken: riskAssessment?.decision || null,
    timestamp: new Date(),
  });
};

const getRiskHistory = async (userId, limit = 10) => {
  return await db.findMany(
    "RiskAssessment",
    { userId },
    {
      order: [["createdAt", "DESC"]],
      sort: { createdAt: -1 },
      limit,
    }
  );
};

const getUserDevices = async (userId) => {
  return await db.findMany(
    "DeviceFingerprint",
    { userId },
    {
      order: [["lastSeenAt", "DESC"]],
      sort: { lastSeenAt: -1 },
    }
  );
};

module.exports = {
  assessRisk,
  logLoginAttempt,
  getRiskHistory,
  getUserDevices,
  DEFAULT_CONFIG,
};
