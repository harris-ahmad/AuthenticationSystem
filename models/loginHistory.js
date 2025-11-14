"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  module.exports = require("../schemas/LoginHistory");
} else {
  const { Model } = require("sequelize");

  module.exports = (sequelize, DataTypes) => {
    class LoginHistory extends Model {
      static associate(models) {
        LoginHistory.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      }
    }

    LoginHistory.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: "users",
            key: "id",
          },
          onDelete: "SET NULL",
        },
        username: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        deviceFingerprint: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        location: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        success: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
        failureReason: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        riskScore: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        riskFactors: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        actionTaken: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        timestamp: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        modelName: "LoginHistory",
        tableName: "login_history",
        timestamps: false,
        indexes: [
          { fields: ["userId"] },
          { fields: ["ipAddress"] },
          { fields: ["timestamp"] },
          { fields: ["success"] },
          { fields: ["riskScore"] },
        ],
      }
    );

    return LoginHistory;
  };
}
