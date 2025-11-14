const mongoose = require("mongoose");

const webAuthnCredentialSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    credentialID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    credentialPublicKey: {
      type: String,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
      default: 0,
    },
    credentialDeviceType: String,
    credentialBackedUp: Boolean,
    transports: [String],
    aaguid: String,
    name: String,
    lastUsedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("WebAuthnCredential", webAuthnCredentialSchema);
