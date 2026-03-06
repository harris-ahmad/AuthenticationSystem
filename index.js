const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const helmet = require("helmet");
const passportConfig = require("./utils/passport");
const emailService = require("./utils/email");
const { loadConfig } = require("./utils/configLoader");
const { initializeDatabase } = require("./utils/database");

const authRoutes = require("./routes/auth");
const twoFactorRoutes = require("./routes/twoFactor");
const oauthRoutes = require("./routes/oauth");
const webauthnRoutes = require("./routes/webauthn");
const profileRoutes = require("./routes/profile");
const riskRoutes = require("./routes/risk");
const indexRouter = require("./routes/index");

const { apiLimiter } = require("./middleware/rateLimiter");
const { csrfProtection, csrfTokenGenerator } = require("./middleware/csrf");

module.exports = async function (app, options = {}) {
  const config = loadConfig(options);

  const {
    sessionSecret,
    usernameField,
    passwordField,
    enableHelmet,
    enableCsrf,
    enableRateLimiting,
    emailConfig,
    googleClientID,
    googleClientSecret,
    googleCallbackURL,
    githubClientID,
    githubClientSecret,
    githubCallbackURL,
    customMiddleware,
    database,
  } = config;

  if (database) {
    try {
      await initializeDatabase(database);
    } catch (error) {
      console.error("Failed to initialize database:", error.message);
      if (database.required !== false) {
        throw error;
      }
    }
  }

  if (!sessionSecret) {
    console.warn("Warning: sessionSecret is required for production use");
  }

  if (enableHelmet) {
    app.use(helmet());
  }

  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cookieParser());

  if (enableRateLimiting) {
    app.use(apiLimiter);
  }

  app.use(
    session({
      secret: sessionSecret || "change-this-secret-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  if (enableCsrf) {
    app.use(csrfTokenGenerator);
    app.get("/csrf-token", (req, res) => {
      res.json({ csrfToken: res.locals.csrfToken });
    });
  }

  passportConfig(passport, {
    usernameField,
    passwordField,
    googleClientID: googleClientID || process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: googleClientSecret || process.env.GOOGLE_CLIENT_SECRET,
    googleCallbackURL: googleCallbackURL || process.env.GOOGLE_CALLBACK_URL,
    githubClientID: githubClientID || process.env.GITHUB_CLIENT_ID,
    githubClientSecret: githubClientSecret || process.env.GITHUB_CLIENT_SECRET,
    githubCallbackURL: githubCallbackURL || process.env.GITHUB_CALLBACK_URL,
  });

  app.use(passport.initialize());
  app.use(passport.session());

  if (emailConfig) {
    emailService.initializeTransporter(emailConfig);
  }

  customMiddleware.forEach((middleware) => {
    app.use(middleware);
  });

  app.use("/auth", enableCsrf ? csrfProtection : (req, res, next) => next(), authRoutes);
  app.use("/auth/2fa", twoFactorRoutes);
  app.use("/auth/oauth", oauthRoutes);
  app.use("/auth/webauthn", webauthnRoutes);
  app.use("/risk", riskRoutes);
  app.use("/profile", profileRoutes);
  app.use("/", indexRouter);

  app.use((err, req, res, next) => {
    console.error(err.stack);

    if (err.code === "EBADCSRFTOKEN") {
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
      });
    }

    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message: "A user with that username or email already exists",
      });
    }

    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
  });
};
