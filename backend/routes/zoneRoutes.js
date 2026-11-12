
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  updateZoneStatus
} = require("../controllers/zoneController");

router.use(protect);

// Admin and Staff can view zones
router.get("/", getAllZones);
router.get("/:id", getZoneById);

// Only Admin can manage zones
router.post("/", authorizeRoles("ADMIN"), createZone);
router.put("/:id", authorizeRoles("ADMIN"), updateZone);
router.patch("/:id/status", authorizeRoles("ADMIN"), updateZoneStatus);

module.exports = router;
