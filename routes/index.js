const express = require("express");
const router = express.Router();

router.get("/", (_, res) => {
  res.status(200).json({ message: "home page" });
});

module.exports = router;
