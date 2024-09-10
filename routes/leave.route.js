const express = require("express");
const router = express.Router();
const leaveController = require("../controller/leave.controller");
const { verifyToken } = require("../utils/authentication");
const {
  checkPlanValidation,
  checkActiveUser
} = require("../utils/middleware/authenticateOrgination");

router.post(
  "/apply",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  leaveController.applyLeave
);
router.post(
  "/approve",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  leaveController.approveLeave
);


router.get(
  "/leave_list",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  leaveController.getLeaveList
);

module.exports = router;
