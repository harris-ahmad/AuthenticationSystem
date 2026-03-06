const mongoose = require("mongoose");

const deviceFingerprintSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: String,
    deviceType: String,
    browser: String,
    os: String,
    trusted: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastSeenAt: Date,
    lastIpAddress: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

deviceFingerprintSchema.methods.isExpired = function () {
  if (!this.lastSeenAt) return true;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.lastSeenAt < thirtyDaysAgo;
};

module.exports = mongoose.model("DeviceFingerprint", deviceFingerprintSchema);
