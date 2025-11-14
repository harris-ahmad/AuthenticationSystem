"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("risk_assessments", {
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
      action: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      deviceFingerprint: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      riskScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      riskLevel: {
        type: Sequelize.ENUM("low", "medium", "high", "critical"),
        allowNull: false,
      },
      factors: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      decision: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex("risk_assessments", ["userId"]);
    await queryInterface.addIndex("risk_assessments", ["riskLevel"]);
    await queryInterface.addIndex("risk_assessments", ["riskScore"]);
    await queryInterface.addIndex("risk_assessments", ["createdAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("risk_assessments");
  },
};
