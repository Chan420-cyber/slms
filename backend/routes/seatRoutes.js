
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createSeat,
  getAllSeats,
  getSeatById,
  updateSeat,
  updateSeatStatus,
  updateSeatPosition
} = require("../controllers/seatController");

router.use(protect);

// Admin and Staff can view seats
router.get("/", getAllSeats);
router.get("/:id", getSeatById);
router.patch("/:id/position", updateSeatPosition);

// Only Admin can manage seats
router.post("/", authorizeRoles("ADMIN"), createSeat);
router.put("/:id", authorizeRoles("ADMIN"), updateSeat);
router.patch("/:id/status", authorizeRoles("ADMIN"), updateSeatStatus);

module.exports = router;
