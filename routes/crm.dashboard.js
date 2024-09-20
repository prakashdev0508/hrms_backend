const express = require("express");
const router = express.Router();
const crmDashboardController = require("../controller/crm.dashoard.controller");
const { verifyToken } = require("../utils/authentication");
const {
  checkPlanValidation,
  checkActiveUser
} = require("../utils/middleware/authenticateOrgination");

router.get(
  "/home",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  crmDashboardController.crmDashoardHome
);
router.get(
  "/users",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  crmDashboardController.crmDashoardUser
);

router.get(
  "/pending_request",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  crmDashboardController.getPendingCounts
);

module.exports = router;
