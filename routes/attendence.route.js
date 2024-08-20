const express = require('express');
const router = express.Router();
const attendenceController = require('../controller/attendence.controller');
const { verifyToken } = require('../utils/authentication');
const { checkPlanValidation } = require('../utils/middleware/authenticateOrgination');

// Create Organization
router.post('/check-in',  verifyToken , checkPlanValidation ,attendenceController.checkInAttendance);
router.post('/check-out',  verifyToken , checkPlanValidation ,attendenceController.checkOutAttendance);
router.post('/monthly-list',  verifyToken , checkPlanValidation ,attendenceController.getMonthlyAttendanceDetails);


module.exports = router;
