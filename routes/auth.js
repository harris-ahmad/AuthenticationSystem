const express = require('express');
const router = express.Router();
const passport = require('passport'); // Correctly import passport here
const bcrypt = require('../utils/bcrypt');
const sequelize = require('../utils/sequelize');
const { DataTypes } = require('sequelize');
const Contractor = require('../models/contractor')(sequelize, DataTypes);

router.post('/register', async (req, res, next) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hashPassword(password);
  try {
    const user = await Contractor.create({ username, password: hashedPassword });
    if (!user) {
      return res.status(400).json({ message: 'Failed to register user' });
    }
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    next(err); // Pass the error to the error handler
  }
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(400).json({ message: 'Incorrect username or password' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.status(200).json({ message: 'Logged in successfully', user });
    });
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
