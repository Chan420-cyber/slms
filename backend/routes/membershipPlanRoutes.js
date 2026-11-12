
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createPlan,
  getAllPlans,
  getPlanById,
  updatePlan,
  updatePlanStatus
} = require("../controllers/membershipPlanController");

// All routes require authentication
router.use(protect);

// Admin and Staff can view plans
router.get("/", getAllPlans);
router.get("/:id", getPlanById);

// Only Admin can manage plans
router.post("/", authorizeRoles("ADMIN"), createPlan);
router.put("/:id", authorizeRoles("ADMIN"), updatePlan);
router.patch("/:id/status", authorizeRoles("ADMIN"), updatePlanStatus);

module.exports = router;
