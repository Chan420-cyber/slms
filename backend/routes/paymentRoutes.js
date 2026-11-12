
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createPayment,
  getAllPayments,
  getPaymentById,
  getMemberPayments,
  updatePaymentStatus,
  getPaymentReceipt
} = require("../controllers/paymentController");

router.use(protect);

// View payments
router.get("/", getAllPayments);
router.get("/member/:memberId", getMemberPayments);
router.get("/:id/receipt", getPaymentReceipt);
router.get("/:id", getPaymentById);

// Record and manage payments
router.post(
  "/",
  authorizeRoles("ADMIN", "STAFF"),
  createPayment
);

router.patch(
  "/:id/status",
  authorizeRoles("ADMIN"),
  updatePaymentStatus
);

module.exports = router;
