const path = require("path");
const fs = require("fs");

const defaultConfig = {
  usernameField: "username",
  passwordField: "password",
  enableHelmet: true,
  enableCsrf: false,
  enableRateLimiting: true,
  customMiddleware: [],
  database: {
    type: "postgres",
    autoSync: true,
  },
};

const loadConfigFile = (configPath) => {
  try {
    if (fs.existsSync(configPath)) {
      const ext = path.extname(configPath);
      if (ext === ".js") {
        return require(configPath);
      } else if (ext === ".json") {
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
    }
  } catch (err) {
    console.warn(`Failed to load config from ${configPath}: ${err.message}`);
  }
  return null;
};

const findConfigFile = () => {
  const env = process.env.NODE_ENV || "development";
  const cwd = process.cwd();

  const possiblePaths = [
    path.join(cwd, `simpleauth.config.${env}.js`),
    path.join(cwd, `simpleauth.config.${env}.json`),
    path.join(cwd, "simpleauth.config.js"),
    path.join(cwd, "simpleauth.config.json"),
    path.join(cwd, "config", "simpleauth.js"),
    path.join(cwd, "config", "simpleauth.json"),
  ];

  for (const configPath of possiblePaths) {
    const config = loadConfigFile(configPath);
    if (config) {
      console.log(`Loaded configuration from: ${configPath}`);
      return config;
    }
  }

  return null;
};

const normalizeConfig = (config) => {
  const normalized = { ...config };

  if (config.email) {
    normalized.emailConfig = config.email;
    delete normalized.email;
  }

  if (config.security) {
    normalized.enableHelmet = config.security.enableHelmet ?? normalized.enableHelmet;
    normalized.enableCsrf = config.security.enableCsrf ?? normalized.enableCsrf;
    normalized.enableRateLimiting = config.security.enableRateLimiting ?? normalized.enableRateLimiting;
    delete normalized.security;
  }

  if (config.oauth?.google) {
    normalized.googleClientID = config.oauth.google.clientID;
    normalized.googleClientSecret = config.oauth.google.clientSecret;
    normalized.googleCallbackURL = config.oauth.google.callbackURL;
  }

  if (config.oauth?.github) {
    normalized.githubClientID = config.oauth.github.clientID;
    normalized.githubClientSecret = config.oauth.github.clientSecret;
    normalized.githubCallbackURL = config.oauth.github.callbackURL;
  }

  if (config.oauth) {
    delete normalized.oauth;
  }

  if (config.database) {
    normalized.database = {
      type: config.database.type || "postgres",
      uri: config.database.uri,
      autoSync: config.database.autoSync !== false,
      alterTables: config.database.alterTables || false,
    };
  }

  return normalized;
};

const loadConfig = (passedOptions = {}) => {
  const fileConfig = findConfigFile() || {};
  const normalizedFileConfig = normalizeConfig(fileConfig);
  const normalizedPassedOptions = normalizeConfig(passedOptions);

  const mergedConfig = {
    ...defaultConfig,
    ...normalizedFileConfig,
    ...normalizedPassedOptions,
  };

  if (mergedConfig.emailConfig && normalizedFileConfig.emailConfig) {
    mergedConfig.emailConfig = {
      ...normalizedFileConfig.emailConfig,
      ...normalizedPassedOptions.emailConfig,
    };
  }

  if (mergedConfig.database && normalizedFileConfig.database) {
    mergedConfig.database = {
      ...normalizedFileConfig.database,
      ...normalizedPassedOptions.database,
    };
  }

  validateConfig(mergedConfig);

  return mergedConfig;
};

const validateConfig = (config) => {
  if (!config.sessionSecret) {
    console.warn(
      "Warning: sessionSecret is not configured. This is required for production use."
    );
  }

  if (config.enableCsrf && !config.csrfSecret && !process.env.CSRF_SECRET) {
    console.warn(
      "Warning: CSRF protection is enabled but csrfSecret is not configured."
    );
  }

  if (config.googleClientID && !config.googleClientSecret) {
    console.warn(
      "Warning: Google OAuth client ID is set but client secret is missing."
    );
  }

  if (config.githubClientID && !config.githubClientSecret) {
    console.warn(
      "Warning: GitHub OAuth client ID is set but client secret is missing."
    );
  }
};

module.exports = {
  loadConfig,
  defaultConfig,
};
