
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelBooking,
  updateBookingStatus
} = require("../controllers/bookingController");

router.use(protect);

// Admin and Staff
router.get("/", getAllBookings);
router.get("/:id", getBookingById);

router.post(
  "/",
  authorizeRoles("ADMIN", "STAFF"),
  createBooking
);

router.patch(
  "/:id/cancel",
  authorizeRoles("ADMIN", "STAFF"),
  cancelBooking
);

router.patch(
  "/:id/status",
  authorizeRoles("ADMIN", "STAFF"),
  updateBookingStatus
);

module.exports = router;
