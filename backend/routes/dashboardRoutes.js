const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  getDashboardOverview,
  getRecentActivity
} = require("../controllers/dashboardController");

router.use(protect);
router.use(authorizeRoles("ADMIN"));

router.get("/overview", getDashboardOverview);
router.get("/activity", getRecentActivity);

module.exports = router;