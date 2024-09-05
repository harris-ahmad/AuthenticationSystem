// index.js
const bodyParser = require("body-parser");
const session = require("express-session");
const passport = require("passport");
const passportConfig = require("./utils/passport");
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const indexRouter = require("./routes/index");

module.exports = function (app, options = {}) {
  const { sessionSecret, usernameField = "username", passwordField = "password" } = options;

  // Middleware
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  // Session setup
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
    })
  );

  // Initialize passport
  passportConfig(passport, { usernameField, passwordField });
  app.use(passport.initialize());
  app.use(passport.session());

  // Routes
  app.use("/auth", authRoutes);
  app.use("/profile", profileRoutes);
  app.use("/", indexRouter);

  // Default error handler
  app.use((err, _, res, _) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
  });
};
