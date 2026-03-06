"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  module.exports = require("../schemas/RiskAssessment");
} else {
  const { Model } = require("sequelize");

  module.exports = (sequelize, DataTypes) => {
    class RiskAssessment extends Model {
      static associate(models) {
        RiskAssessment.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      }
    }

    RiskAssessment.init(
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
        action: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        deviceFingerprint: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        riskScore: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        riskLevel: {
          type: DataTypes.ENUM("low", "medium", "high", "critical"),
          allowNull: false,
        },
        factors: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        decision: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "RiskAssessment",
        tableName: "risk_assessments",
        timestamps: true,
        updatedAt: false,
        indexes: [
          { fields: ["userId"] },
          { fields: ["riskLevel"] },
          { fields: ["riskScore"] },
          { fields: ["createdAt"] },
        ],
      }
    );

    return RiskAssessment;
  };
}
