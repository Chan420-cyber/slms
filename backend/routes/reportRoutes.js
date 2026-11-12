
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getFinancialOverview,
  getMonthlyReport,
  getPaymentMethodReport,
  getExpenseCategoryReport,
  getDailyRevenueReport
} = require("../controllers/reportController");

router.use(protect);

// Financial reports are Admin-only
router.use(authorizeRoles("ADMIN"));

router.get("/financial-overview", getFinancialOverview);
router.get("/monthly", getMonthlyReport);
router.get("/daily", getDailyRevenueReport);
router.get("/payment-methods", getPaymentMethodReport);
router.get("/expense-categories", getExpenseCategoryReport);

module.exports = router;
