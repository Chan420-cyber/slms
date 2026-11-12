
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense
} = require("../controllers/expenseController");

router.use(protect);

// Admin and Staff can view expenses
router.get("/", getAllExpenses);
router.get("/:id", getExpenseById);

// Admin and Staff can record expenses
router.post(
  "/",
  authorizeRoles("ADMIN", "STAFF"),
  createExpense
);

// Only Admin can correct financial records
router.put(
  "/:id",
  authorizeRoles("ADMIN"),
  updateExpense
);

module.exports = router;
