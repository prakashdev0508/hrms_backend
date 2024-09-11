const express = require('express');
const router = express.Router();
const attendenceController = require('../controller/attendence.controller');
const { verifyToken } = require('../utils/authentication');
const { checkPlanValidation , checkActiveUser} = require('../utils/middleware/authenticateOrgination');

// Create Organization
router.post('/check-in',  verifyToken , checkPlanValidation ,checkActiveUser ,attendenceController.checkInAttendance);
router.post('/check-out',  verifyToken , checkPlanValidation , checkActiveUser ,attendenceController.checkOutAttendance);
router.post('/monthly-list',  verifyToken , checkPlanValidation , checkActiveUser ,attendenceController.getMonthlyAttendanceDetails);
router.post('/regularize/apply',  verifyToken , checkPlanValidation , checkActiveUser ,attendenceController.applyRegularization);
router.post('/regularize/action',  verifyToken , checkPlanValidation , checkActiveUser ,attendenceController.approveRegularization);


module.exports = router;
