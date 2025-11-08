require('dotenv').config();
const express = require('express');
const simpleauth = require('@harrisahmad/simpleauth');

const app = express();

simpleauth(app);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to your authenticated app' });
});

app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ message: `Welcome, ${req.user.username}`, user: req.user });
  } else {
    res.status(401).json({ message: 'Please login first' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
