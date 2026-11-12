
const express = require("express");
const router = express.Router();

const { login } = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");

router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.status(200).json({
    message: "Authenticated successfully",
    user: req.user
  });
});

module.exports = router;
