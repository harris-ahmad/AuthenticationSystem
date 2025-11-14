"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("login_history", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      username: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deviceFingerprint: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      success: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
      },
      failureReason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      riskScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      riskFactors: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      actionTaken: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("login_history", ["userId"]);
    await queryInterface.addIndex("login_history", ["ipAddress"]);
    await queryInterface.addIndex("login_history", ["timestamp"]);
    await queryInterface.addIndex("login_history", ["success"]);
    await queryInterface.addIndex("login_history", ["riskScore"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("login_history");
  },
};
