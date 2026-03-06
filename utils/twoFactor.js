const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

const generateSecret = (username) => {
  return speakeasy.generateSecret({
    name: `SimpleAuth (${username})`,
    length: 32,
  });
};

const generateQRCode = async (otpauthUrl) => {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (err) {
    throw new Error("Failed to generate QR code");
  }
};

const verifyToken = (token, secret) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2,
  });
};

const generateBackupCodes = (count = 10) => {
  const crypto = require("crypto");
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
};

module.exports = {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes,
};
