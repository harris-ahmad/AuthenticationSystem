const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USERNAME,
  String(process.env.DB_PASSWD),
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
  }
);

module.exports = sequelize;