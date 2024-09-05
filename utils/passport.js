const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("./bcrypt");
const sequelize = require("../utils/sequelize");
const { DataTypes } = require("sequelize");

const Contractor = require("../models/contractor")(sequelize, DataTypes);

module.exports = function (passport, { usernameField, passwordField }) {
  passport.use(
    new LocalStrategy({ usernameField, passwordField }, async (username, password, done) => {
      try {
        const user = await Contractor.findOne({ where: { [usernameField]: username } });
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await bcrypt.comparePassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await Contractor.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
