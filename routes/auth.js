const express = require('express');
const router = express.Router();
const passport = require('../utils/passport');
const { User } = require('../models');
const bcrypt = require('../utils/bcrypt');

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hashPassword(password);
  try {
    const user = await User.create({ username, password: hashedPassword });
    res.status(201).send('User registered');
  } catch (err) {
    res.status(400).send('Error registering user');
  }
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/profile',
  failureRedirect: '/login'
}));

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
