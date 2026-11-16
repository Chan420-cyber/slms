const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getAllUsers,
  createUser,
  updateUserStatus,
  changePassword
} = require("../controllers/userController");

router.use(protect);

// Change password (Any logged-in user can change their own password)
router.put("/change-password", changePassword);

// Everything below is Admin-only
router.use(authorizeRoles("ADMIN"));

router.get("/", getAllUsers);
router.post("/", createUser);
router.patch("/:id/status", updateUserStatus);

module.exports = router;