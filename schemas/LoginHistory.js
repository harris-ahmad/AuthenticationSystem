const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  username: String,
  ipAddress: {
    type: String,
    index: true,
  },
  userAgent: String,
  deviceFingerprint: String,
  location: mongoose.Schema.Types.Mixed,
  success: {
    type: Boolean,
    required: true,
    index: true,
  },
  failureReason: String,
  riskScore: {
    type: Number,
    index: true,
  },
  riskFactors: mongoose.Schema.Types.Mixed,
  actionTaken: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("LoginHistory", loginHistorySchema);
