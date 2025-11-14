const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
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
    isRevoked: {
      type: Boolean,
      default: false,
    },
    deviceInfo: mongoose.Schema.Types.Mixed,
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.methods.isExpired = function () {
  return Date.now() >= this.expiresAt.getTime();
};

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
