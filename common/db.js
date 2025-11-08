/**
 * Database Adapter to abstract MongoDB and Sequelize operations
 * 
 * Uses utility functions to determine the database type and models.
 * Provides common CRUD operations in a unified way and has similar API for both databases.
 * @module common/db
 * 
 * @author Harris Ahmad
 * @license MIT
 * @copyright 2025 Harris Ahmad
 */


const { getModels, getDatabaseType, isConnected } = require("../utils/database");

class DatabaseAdapter {
  constructor() {
    this.dbType = null;
    this.models = null;
  }

  _init() {
    if (!isConnected()) {
      throw new Error("Database not connected");
    }
    if (!this.dbType) {
      this.dbType = getDatabaseType();
      this.models = getModels();
    }
  }

  _getModel(modelName) {
    this._init();
    if (!this.models[modelName]) {
      throw new Error(`Model ${modelName} not found`);
    }
    return this.models[modelName];
  }

  async findOne(modelName, query) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.findOne(query);
    } else {
      return await Model.findOne({ where: query });
    }
  }

  async findById(modelName, id) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.findById(id);
    } else {
      return await Model.findByPk(id);
    }
  }

  async findMany(modelName, query = {}, options = {}) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      let mongoQuery = Model.find(query);

      if (options.sort) {
        mongoQuery = mongoQuery.sort(options.sort);
      }
      if (options.limit) {
        mongoQuery = mongoQuery.limit(options.limit);
      }
      if (options.skip) {
        mongoQuery = mongoQuery.skip(options.skip);
      }

      return await mongoQuery;
    } else {
      const sequelizeOptions = { where: query };

      if (options.order) {
        sequelizeOptions.order = options.order;
      }
      if (options.limit) {
        sequelizeOptions.limit = options.limit;
      }
      if (options.offset) {
        sequelizeOptions.offset = options.offset;
      }

      return await Model.findAll(sequelizeOptions);
    }
  }

  async findAll(modelName, query = {}, options = {}) {
    return await this.findMany(modelName, query, options);
  }

  async create(modelName, data) {
    const Model = this._getModel(modelName);
    return await Model.create(data);
  }

  async update(modelName, query, data) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.updateOne(query, data);
    } else {
      return await Model.update(data, { where: query });
    }
  }

  async updateMany(modelName, query, data) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.updateMany(query, data);
    } else {
      return await Model.update(data, { where: query });
    }
  }

  async delete(modelName, query) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.deleteOne(query);
    } else {
      return await Model.destroy({ where: query });
    }
  }

  async deleteMany(modelName, query) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.deleteMany(query);
    } else {
      return await Model.destroy({ where: query });
    }
  }

  async count(modelName, query = {}) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      return await Model.countDocuments(query);
    } else {
      return await Model.count({ where: query });
    }
  }

  async findOrCreate(modelName, query, defaults) {
    const Model = this._getModel(modelName);

    if (this.dbType === "mongodb") {
      let doc = await Model.findOne(query);
      let created = false;

      if (!doc) {
        doc = await Model.create({ ...query, ...defaults });
        created = true;
      }

      return [doc, created];
    } else {
      return await Model.findOrCreate({
        where: query,
        defaults: defaults,
      });
    }
  }

  getModel(modelName) {
    return this._getModel(modelName);
  }

  getDatabaseType() {
    this._init();
    return this.dbType;
  }
}

module.exports = new DatabaseAdapter();
