// routes/profile.js
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ message: `Hello, ${req.user.username}` });
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

module.exports = router;
