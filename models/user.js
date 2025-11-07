"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
      User.hasMany(models.AuditLog, { foreignKey: "userId", as: "auditLogs" });
      User.hasMany(models.Session, { foreignKey: "userId", as: "sessions" });
    }

    toJSON() {
      const values = { ...this.get() };
      delete values.password;
      delete values.twoFactorSecret;
      delete values.passwordResetToken;
      delete values.passwordResetExpires;
      delete values.emailVerificationToken;
      return values;
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          len: [3, 30],
          is: /^[a-zA-Z0-9_-]+$/,
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: "user",
        allowNull: false,
      },
      permissions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      accountLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLoginIp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      provider: {
        type: DataTypes.STRING,
        defaultValue: "local",
      },
      providerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      apiKey: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true,
      indexes: [
        { fields: ["username"] },
        { fields: ["email"] },
        { fields: ["apiKey"] },
        { fields: ["provider", "providerId"] },
      ],
    }
  );

  return User;
};
