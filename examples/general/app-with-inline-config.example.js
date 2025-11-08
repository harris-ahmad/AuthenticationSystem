require('dotenv').config();
const express = require('express');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();

simpleauth(app, {
  sessionSecret: process.env.SECRET_KEY,

  security: {
    enableHelmet: true,
    enableCsrf: false,
    enableRateLimiting: true,
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
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
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to your authenticated app' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
