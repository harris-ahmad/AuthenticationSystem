const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const crypto = require("crypto");

const RP_NAME = process.env.WEBAUTHN_RP_NAME || "SimpleAuth";
const RP_ID = process.env.WEBAUTHN_RP_ID || "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN || "http://localhost:5500";

const challengeStore = new Map();

const generateChallenge = () => {
  return crypto.randomBytes(32).toString("base64url");
};

const storeChallenge = (userId, challenge) => {
  challengeStore.set(userId, {
    challenge,
    timestamp: Date.now(),
  });

  setTimeout(() => {
    challengeStore.delete(userId);
  }, 5 * 60 * 1000);
};

const getChallenge = (userId) => {
  const stored = challengeStore.get(userId);
  if (!stored) return null;

  if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
    challengeStore.delete(userId);
    return null;
  }

  return stored.challenge;
};

const deleteChallenge = (userId) => {
  challengeStore.delete(userId);
};

const createRegistrationOptions = async (user, existingCredentials = [], requestOrigin = null) => {
  const userIdString = user.id || user._id;
  const userIdBuffer = Buffer.from(userIdString.toString());

  let effectiveRpId = RP_ID;
  if (requestOrigin) {
    try {
      const url = new URL(requestOrigin);
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        effectiveRpId = 'localhost';
      }
    } catch (err) {
      console.warn('Failed to parse request origin:', err.message);
    }
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: effectiveRpId,
    userID: userIdBuffer,
    userName: user.username,
    userDisplayName: user.username,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialID, // Already base64url string
      type: "public-key",
      transports: cred.transports || [],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
  });

  const userId = user.id || user._id;
  storeChallenge(userId.toString(), options.challenge);

  return options;
};

const verifyRegistration = async (user, response) => {
  const userId = user.id || user._id;
  const expectedChallenge = getChallenge(userId.toString());

  if (!expectedChallenge) {
    throw new Error("Challenge not found or expired");
  }

  const allowedOrigins = [
    ORIGIN,
    ORIGIN.replace('localhost', '127.0.0.1'),
    ORIGIN.replace('127.0.0.1', 'localhost'),
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: allowedOrigins,
    expectedRPID: RP_ID,
  });

  deleteChallenge(userId.toString());

  return verification;
};

const createAuthenticationOptions = async (credentials = []) => {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: credentials.map((cred) => ({
      id: cred.credentialID, // Already base64url string from registration
      type: "public-key",
      transports: cred.transports || [],
    })),
    userVerification: "preferred",
  });

  return options;
};

const verifyAuthentication = async (credential, response, challenge) => {
  const allowedOrigins = [
    ORIGIN,
    ORIGIN.replace('localhost', '127.0.0.1'),
    ORIGIN.replace('127.0.0.1', 'localhost'),
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: allowedOrigins,
    expectedRPID: RP_ID,
    credential: {
      id: credential.credentialID, // base64url string
      publicKey: Buffer.from(credential.credentialPublicKey, "base64"),
      counter: Number(credential.counter),
      transports: credential.transports || [],
    },
  });

  return verification;
};

module.exports = {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptions,
  verifyAuthentication,
  storeChallenge,
  getChallenge,
  deleteChallenge,
  generateChallenge,
};
