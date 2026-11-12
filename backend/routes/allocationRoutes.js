
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
  createAllocation,
  getAllAllocations,
  getAllocationById,
  endAllocation,
  cancelAllocation
} = require("../controllers/allocationController");

router.use(protect);

// Admin and Staff
router.get("/", getAllAllocations);
router.get("/:id", getAllocationById);
router.post("/", authorizeRoles("ADMIN", "STAFF"), createAllocation);
router.patch("/:id/end", authorizeRoles("ADMIN", "STAFF"), endAllocation);

// Admin only
router.patch("/:id/cancel", authorizeRoles("ADMIN"), cancelAllocation);

module.exports = router;
