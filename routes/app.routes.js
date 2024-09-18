
const express = require('express');
const router = express.Router();
const appController = require('../controller/app.controller');
const { verifyToken } = require('../utils/authentication');
const { checkPlanValidation, checkActiveUser } = require('../utils/middleware/authenticateOrgination');

router.get("/request_data", verifyToken , checkPlanValidation , checkActiveUser , appController.getRequestDetails)

module.exports = router;
