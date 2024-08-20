const express = require("express");
const router = express.Router();
const leaveController = require("../controller/leave.controller");
const { verifyToken } = require("../utils/authentication");
const {
  checkPlanValidation,
} = require("../utils/middleware/authenticateOrgination");

router.post(
  "/apply",
  verifyToken,
  checkPlanValidation,
  leaveController.applyLeave
);
router.post(
  "/approve",
  verifyToken,
  checkPlanValidation,
  leaveController.approveLeave
);

module.exports = router;
