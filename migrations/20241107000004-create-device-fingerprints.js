"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("device_fingerprints", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      fingerprint: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      deviceName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deviceType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      browser: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      os: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      trusted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lastSeenAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      lastIpAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("device_fingerprints", ["userId"]);
    await queryInterface.addIndex("device_fingerprints", ["fingerprint"]);
    await queryInterface.addIndex("device_fingerprints", ["trusted"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("device_fingerprints");
  },
};
