"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    }
  }

  AuditLog.init(
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
      resource: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      userAgent: {
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
      modelName: "AuditLog",
      tableName: "audit_logs",
      timestamps: true,
      updatedAt: false,
      indexes: [
        { fields: ["userId"] },
        { fields: ["action"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return AuditLog;
};
