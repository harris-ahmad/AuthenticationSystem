const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    resource: String,
    status: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
