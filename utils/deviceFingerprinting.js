const crypto = require("crypto");
const UAParser = require("ua-parser-js");

const generateFingerprint = (req) => {
  const parser = new UAParser(req.get("user-agent"));
  const result = parser.getResult();

  const components = [
    req.get("user-agent") || "",
    req.get("accept-language") || "",
    req.get("accept-encoding") || "",
    result.browser.name || "",
    result.os.name || "",
    result.device.type || "desktop",
  ];

  const fingerprintString = components.join("|");
  return crypto.createHash("sha256").update(fingerprintString).digest("hex");
};

const parseDeviceInfo = (req) => {
  const parser = new UAParser(req.get("user-agent"));
  const result = parser.getResult();

  return {
    browser: `${result.browser.name || "Unknown"} ${result.browser.version || ""}`.trim(),
    os: `${result.os.name || "Unknown"} ${result.os.version || ""}`.trim(),
    device: result.device.type || "desktop",
    deviceName: result.device.model || result.device.vendor || "Unknown Device",
  };
};

const isKnownDevice = async (userId, fingerprint) => {
  const db = require("../common/db");
  const device = await db.findOne("DeviceFingerprint", { userId, fingerprint });
  return !!device;
};

const trustDevice = async (userId, fingerprint, ipAddress, req) => {
  const db = require("../common/db");
  const deviceInfo = parseDeviceInfo(req);

  const [device, created] = await db.findOrCreate(
    "DeviceFingerprint",
    { fingerprint },
    {
      userId,
      fingerprint,
      ...deviceInfo,
      trusted: true,
      lastSeenAt: new Date(),
      lastIpAddress: ipAddress,
    }
  );

  if (!created) {
    await db.update(
      "DeviceFingerprint",
      { fingerprint },
      {
        trusted: true,
        lastSeenAt: new Date(),
        lastIpAddress: ipAddress,
      }
    );
  }

  return device;
};

const updateDeviceLastSeen = async (fingerprint, ipAddress) => {
  const db = require("../common/db");
  await db.update(
    "DeviceFingerprint",
    { fingerprint },
    { lastSeenAt: new Date(), lastIpAddress: ipAddress }
  );
};

module.exports = {
  generateFingerprint,
  parseDeviceInfo,
  isKnownDevice,
  trustDevice,
  updateDeviceLastSeen,
};
