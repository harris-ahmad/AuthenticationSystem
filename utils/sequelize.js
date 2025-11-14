const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const dbType = process.env.DB_TYPE || "postgres";

if (dbType === "mongodb") {
  const mockModel = class {
    static findOne() { return Promise.resolve(null); }
    static findAll() { return Promise.resolve([]); }
    static findByPk() { return Promise.resolve(null); }
    static create() { return Promise.resolve({}); }
    static update() { return Promise.resolve([0]); }
    static destroy() { return Promise.resolve(0); }
    static count() { return Promise.resolve(0); }
    save() { return Promise.resolve(this); }
  };

  module.exports = {
    Sequelize: { Op: {} },
    query: () => Promise.resolve([]),
    authenticate: () => Promise.resolve(),
    sync: () => Promise.resolve(),
    close: () => Promise.resolve(),
    define: () => mockModel,
  };
} else {
  const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWD, {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT,
    logging: false,
  });

  module.exports = sequelize;
}
