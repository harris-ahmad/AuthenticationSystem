"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  module.exports = require("../schemas/Session");
} else {
  const { Model } = require("sequelize");

  module.exports = (sequelize, DataTypes) => {
    class Session extends Model {
      static associate(models) {
        Session.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      }

      isExpired() {
        return Date.now() >= this.expiresAt.getTime();
      }
    }

    Session.init(
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
        sessionId: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        deviceInfo: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        ipAddress: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        lastActivityAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "Session",
        tableName: "sessions",
        timestamps: true,
        indexes: [
          { fields: ["userId"] },
          { fields: ["sessionId"] },
          { fields: ["expiresAt"] },
        ],
      }
    );

    return Session;
  };
}
