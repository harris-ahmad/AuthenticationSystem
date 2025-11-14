const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    deviceInfo: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    lastActivityAt: Date,
  },
  {
    timestamps: true,
  }
);

sessionSchema.methods.isExpired = function () {
  return Date.now() >= this.expiresAt.getTime();
};

module.exports = mongoose.model("Session", sessionSchema);
