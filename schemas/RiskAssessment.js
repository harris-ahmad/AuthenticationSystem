const mongoose = require("mongoose");

const riskAssessmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    ipAddress: String,
    deviceFingerprint: String,
    riskScore: {
      type: Number,
      required: true,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
      index: true,
    },
    factors: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    decision: {
      type: String,
      required: true,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

riskAssessmentSchema.index({ createdAt: -1 });

module.exports = mongoose.model("RiskAssessment", riskAssessmentSchema);
