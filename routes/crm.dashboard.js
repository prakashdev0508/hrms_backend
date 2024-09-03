const express = require('express');
const router = express.Router();
const crmDashboardController = require('../controller/crm.dashoard.controller');
const { verifyToken } = require('../utils/authentication');
const { checkPlanValidation } = require('../utils/middleware/authenticateOrgination');

router.get("/home" , verifyToken , checkPlanValidation ,  crmDashboardController.crmDashoardHome );

module.exports = router;
