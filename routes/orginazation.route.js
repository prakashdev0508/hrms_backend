const express = require("express");
const router = express.Router();
const organizationController = require("../controller/orginasation.controller");
const { verifyToken } = require("../utils/authentication");
const {
  checkActiveUser,
  checkPlanValidation,
} = require("../utils/middleware/authenticateOrgination");

// Create Organization
router.post("/create", organizationController.createOrganization);

// Get All Organizations
router.get("/", organizationController.getAllOrganizations);

// router.get('/:id', organizationController.getOrganizationById);

// Update Organization
router.put("/update/:id", organizationController.updateOrganization);

// Delete Organization
router.delete("/:id", organizationController.deleteOrganization);
router.post(
  "/upload/holiday_list",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  organizationController.uploadHolidays
);

module.exports = router;
