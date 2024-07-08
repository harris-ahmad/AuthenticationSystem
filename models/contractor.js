'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Contractor extends Model {
    static associate(models) {
      // define association here
    }
  }
  Contractor.init({
    username: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Contractor',
  });
  return Contractor;
};