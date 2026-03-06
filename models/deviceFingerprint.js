"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  module.exports = require("../schemas/DeviceFingerprint");
} else {
  const { Model } = require("sequelize");

  module.exports = (sequelize, DataTypes) => {
    class DeviceFingerprint extends Model {
      static associate(models) {
        DeviceFingerprint.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      }

      isExpired() {
        if (!this.lastSeenAt) return true;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return this.lastSeenAt < thirtyDaysAgo;
      }
    }

    DeviceFingerprint.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        fingerprint: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        deviceName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        deviceType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        browser: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        os: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        trusted: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        lastSeenAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        lastIpAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "DeviceFingerprint",
        tableName: "device_fingerprints",
        timestamps: true,
        indexes: [
          { fields: ["userId"] },
          { fields: ["fingerprint"] },
          { fields: ["trusted"] },
        ],
      }
    );

    return DeviceFingerprint;
  };
}
