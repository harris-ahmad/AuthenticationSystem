"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("audit_logs", {
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
      resource: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      ipAddress: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userAgent: {
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
    });

    await queryInterface.addIndex("audit_logs", ["userId"]);
    await queryInterface.addIndex("audit_logs", ["action"]);
    await queryInterface.addIndex("audit_logs", ["status"]);
    await queryInterface.addIndex("audit_logs", ["createdAt"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("audit_logs");
  },
};
