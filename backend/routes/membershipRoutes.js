
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createMembership,
  getAllMemberships,
  getMembershipById,
  renewMembership,
  cancelMembership
} = require("../controllers/membershipController");

router.use(protect);

// Admin and Staff
router.post("/", authorizeRoles("ADMIN", "STAFF"), createMembership);
router.get("/", authorizeRoles("ADMIN", "STAFF"), getAllMemberships);
router.get("/:id", authorizeRoles("ADMIN", "STAFF"), getMembershipById);
router.post("/:id/renew", authorizeRoles("ADMIN", "STAFF"), renewMembership);

// Admin only
router.patch("/:id/cancel", authorizeRoles("ADMIN"), cancelMembership);

module.exports = router;
