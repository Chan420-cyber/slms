
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");

const {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  updateMemberStatus,
  renewMembership,
} = require("../controllers/memberController");

// All member routes require authentication
router.use(protect);

router.post("/", createMember);
router.get("/", getAllMembers);
router.get("/:id", getMemberById);
router.put("/:id", updateMember);
router.patch("/:id/status", updateMemberStatus);
router.post("/:id/renew-membership", renewMembership);


module.exports = router;
