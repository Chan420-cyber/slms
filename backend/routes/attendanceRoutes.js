
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  checkIn,
  checkOut,
  getAllAttendance,
  getAttendanceById,
  getTodayAttendance
} = require("../controllers/attendanceController");

router.use(protect);

// Admin and Staff
router.get("/", getAllAttendance);
router.get("/today", getTodayAttendance);
router.get("/:id", getAttendanceById);

router.post(
  "/check-in",
  authorizeRoles("ADMIN", "STAFF"),
  checkIn
);

router.put(
  "/:id/check-out",
  authorizeRoles("ADMIN", "STAFF"),
  checkOut
);

module.exports = router;
