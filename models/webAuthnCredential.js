"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  module.exports = require("../schemas/WebAuthnCredential");
} else {
  const { Model } = require("sequelize");

  module.exports = (sequelize, DataTypes) => {
    class WebAuthnCredential extends Model {
      static associate(models) {
        WebAuthnCredential.belongsTo(models.User, { foreignKey: "userId", as: "user" });
      }
    }

    WebAuthnCredential.init(
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
        credentialID: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: true,
        },
        credentialPublicKey: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        counter: {
          type: DataTypes.BIGINT,
          allowNull: false,
          defaultValue: 0,
        },
        credentialDeviceType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        credentialBackedUp: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
        },
        transports: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: true,
        },
        aaguid: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        lastUsedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
      },
      {
        sequelize,
        modelName: "WebAuthnCredential",
        tableName: "webauthn_credentials",
        timestamps: true,
        indexes: [
          { fields: ["userId"] },
          { fields: ["credentialID"] },
        ],
      }
    );

    return WebAuthnCredential;
  };
}
