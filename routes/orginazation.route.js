const express = require('express');
const router = express.Router();
const organizationController = require('../controller/orginasation.controller');
const { verifyToken } = require('../utils/authentication');

// Create Organization
router.post('/create', organizationController.createOrganization);

// Get All Organizations
router.get('/', organizationController.getAllOrganizations);

// router.get('/:id', organizationController.getOrganizationById);

// Update Organization
router.put('/update/:id' , organizationController.updateOrganization);

// Delete Organization
router.delete('/:id' , organizationController.deleteOrganization);

module.exports = router;
