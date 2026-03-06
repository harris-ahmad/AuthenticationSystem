const mongoose = require("mongoose");

let dbType = null;
let dbConnected = false;
let sequelize = null;

const initializeDatabase = async (config) => {
  dbType = config.type || process.env.DB_TYPE || "postgres";

  if (dbType === "mongodb") {
    return await initializeMongoDB(config);
  } else if (dbType === "postgres" || dbType === "postgresql") {
    return await initializePostgres(config);
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
};

const initializeMongoDB = async (config) => {
  try {
    const uri = config.uri || process.env.MONGODB_URI || "mongodb://localhost:27017/simpleauth";

    await mongoose.connect(uri);

    console.log("MongoDB connected successfully");

    if (config.autoSync !== false) {
      await syncMongoDBSchemas();
    }

    dbConnected = true;
    return { type: "mongodb", connected: true };
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    throw error;
  }
};

const initializePostgres = async (config) => {
  try {
    if (!sequelize) {
      sequelize = require("./sequelize");
    }

    await sequelize.authenticate();
    console.log("PostgreSQL connected successfully");

    if (config.autoSync !== false) {
      await sequelize.sync({ alter: config.alterTables || false });
      console.log("PostgreSQL tables synchronized");
    }

    dbConnected = true;
    return { type: "postgres", connected: true };
  } catch (error) {
    console.error("PostgreSQL connection error:", error.message);
    throw error;
  }
};

const syncMongoDBSchemas = async () => {
  try {
    const User = require("../schemas/User");
    const RefreshToken = require("../schemas/RefreshToken");
    const AuditLog = require("../schemas/AuditLog");
    const Session = require("../schemas/Session");
    const DeviceFingerprint = require("../schemas/DeviceFingerprint");
    const LoginHistory = require("../schemas/LoginHistory");
    const RiskAssessment = require("../schemas/RiskAssessment");
    const WebAuthnCredential = require("../schemas/WebAuthnCredential");

    await Promise.all([
      User.syncIndexes(),
      RefreshToken.syncIndexes(),
      AuditLog.syncIndexes(),
      Session.syncIndexes(),
      DeviceFingerprint.syncIndexes(),
      LoginHistory.syncIndexes(),
      RiskAssessment.syncIndexes(),
      WebAuthnCredential.syncIndexes(),
    ]);

    console.log("MongoDB indexes synchronized successfully");
  } catch (error) {
    console.error("MongoDB index synchronization error:", error.message);
    throw error;
  }
};

const getModels = () => {
  if (!dbConnected) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }

  if (dbType === "mongodb") {
    return {
      User: require("../schemas/User"),
      RefreshToken: require("../schemas/RefreshToken"),
      AuditLog: require("../schemas/AuditLog"),
      Session: require("../schemas/Session"),
      DeviceFingerprint: require("../schemas/DeviceFingerprint"),
      LoginHistory: require("../schemas/LoginHistory"),
      RiskAssessment: require("../schemas/RiskAssessment"),
      WebAuthnCredential: require("../schemas/WebAuthnCredential"),
    };
  } else {
    const { DataTypes } = require("sequelize");
    return {
      User: require("../models/user")(sequelize, DataTypes),
      RefreshToken: require("../models/refreshToken")(sequelize, DataTypes),
      AuditLog: require("../models/auditLog")(sequelize, DataTypes),
      Session: require("../models/session")(sequelize, DataTypes),
      DeviceFingerprint: require("../models/deviceFingerprint")(sequelize, DataTypes),
      LoginHistory: require("../models/loginHistory")(sequelize, DataTypes),
      RiskAssessment: require("../models/riskAssessment")(sequelize, DataTypes),
      WebAuthnCredential: require("../models/webAuthnCredential")(sequelize, DataTypes),
    };
  }
};

const getDatabaseType = () => dbType;

const isConnected = () => dbConnected;

const closeDatabase = async () => {
  if (dbType === "mongodb" && dbConnected) {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  } else if ((dbType === "postgres" || dbType === "postgresql") && dbConnected) {
    await sequelize.close();
    console.log("PostgreSQL disconnected");
  }
  dbConnected = false;
};

module.exports = {
  initializeDatabase,
  getModels,
  getDatabaseType,
  isConnected,
  closeDatabase,
};
