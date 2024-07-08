// routes/profile.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`Hello, ${req.user.username}`);
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
