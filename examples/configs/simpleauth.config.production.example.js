require('dotenv').config();

module.exports = {
  sessionSecret: process.env.SECRET_KEY,

  // if you want to use email to sign in users, simply change the usernameField to 'email'
  usernameField: 'username',
  passwordField: 'password',

  security: {
    enableHelmet: true,
    enableCsrf: true,
    enableRateLimiting: true,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: true,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  oauth: {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://yourdomain.com/auth/oauth/google/callback',
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'https://yourdomain.com/auth/oauth/github/callback',
    },
  },

  customMiddleware: [
  ],
};
