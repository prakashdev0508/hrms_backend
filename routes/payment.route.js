const express = require('express');
const router = express.Router();
const paymentController = require('../controller/payment.controller');
const { verifyToken } = require('../utils/authentication');

// Create Payment
router.post('/create', verifyToken ,paymentController.createPayment);


module.exports = router;
