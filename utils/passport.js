const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const bcrypt = require("./bcrypt");
const sequelize = require("./sequelize");
const { DataTypes } = require("sequelize");

let User;

const initializeModels = () => {
  if (!User) User = require("../models/user")(sequelize, DataTypes);
};

module.exports = function (passport, options = {}) {
  initializeModels();

  const { usernameField = "username", passwordField = "password" } = options;

  passport.use(
    new LocalStrategy({ usernameField, passwordField }, async (username, password, done) => {
      try {
        const user = await User.findOne({ where: { [usernameField]: username } });
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
          return done(null, false, { message: "Account is temporarily locked." });
        }

        if (!user.active) {
          return done(null, false, { message: "Account is inactive." });
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

  if (options.googleClientID && options.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: options.googleClientID,
          clientSecret: options.googleClientSecret,
          callbackURL: options.googleCallbackURL || "/auth/oauth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({
              where: { provider: "google", providerId: profile.id },
            });

            if (!user) {
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              const username =
                profile.displayName?.replace(/\s+/g, "_").toLowerCase() ||
                `google_${profile.id}`;

              user = await User.create({
                username,
                email,
                provider: "google",
                providerId: profile.id,
                emailVerified: true,
                active: true,
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  if (options.githubClientID && options.githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: options.githubClientID,
          clientSecret: options.githubClientSecret,
          callbackURL: options.githubCallbackURL || "/auth/oauth/github/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({
              where: { provider: "github", providerId: profile.id },
            });

            if (!user) {
              const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
              const username = profile.username || `github_${profile.id}`;

              user = await User.create({
                username,
                email,
                provider: "github",
                providerId: profile.id,
                emailVerified: !!email,
                active: true,
              });
            }

            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};
