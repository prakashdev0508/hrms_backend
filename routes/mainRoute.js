const express = require("express");
const router = express.Router();
const {
  createPricing,
  getAllPricing,
  getPricingById,
  updatePricing,
  deletePricing,
} = require("../controller/pricingController");
const { register, login, me } = require("../controller/userController");
const { verifyToken } = require("../utils/authentication");
const { checkPlanValidation } = require("../utils/middleware/authenticateOrgination");

// Pricing Routes
router.post("/pricing/create", createPricing);
router.get("/pricing", getAllPricing);
router.get("/pricing/:id", getPricingById);
router.put("/pricing/update/:id", verifyToken, updatePricing);
router.delete("/pricing/delete/:id", verifyToken, deletePricing);

// User Routes
router.post("/user/create", register);
router.post("/user/login", login);
router.get("/user/me", verifyToken, checkPlanValidation ,me);

module.exports = router;
