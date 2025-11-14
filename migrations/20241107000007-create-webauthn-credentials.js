"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("webauthn_credentials", {
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
      credentialID: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true,
      },
      credentialPublicKey: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      counter: {
        type: Sequelize.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      credentialDeviceType: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      credentialBackedUp: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
      },
      transports: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: true,
      },
      aaguid: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastUsedAt: {
        type: Sequelize.DATE,
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

    await queryInterface.addIndex("webauthn_credentials", ["userId"]);
    await queryInterface.addIndex("webauthn_credentials", ["credentialID"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("webauthn_credentials");
  },
};
