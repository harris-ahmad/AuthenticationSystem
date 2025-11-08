require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SECRET_KEY,

  database: {
    type: 'mongodb',
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/simpleauth',
    autoSync: true,
  },

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/auth/oauth/google/callback',
    },
  },
};
