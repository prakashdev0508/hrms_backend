const express = require("express");
const router = express.Router();
const {
  createPricing,
  getAllPricing,
  getPricingById,
  updatePricing,
  deletePricing,
} = require("../controller/pricingController");
const {
  register,
  login,
  me,
  userDetail,
  updateuser,
} = require("../controller/userController");
const { verifyToken } = require("../utils/authentication");
const {
  checkPlanValidation,
  checkActiveUser,
} = require("../utils/middleware/authenticateOrgination");

// Pricing Routes
router.post("/pricing/create", createPricing);
router.get("/pricing", getAllPricing);
router.get("/pricing/:id", getPricingById);
router.put("/pricing/update/:id", verifyToken, updatePricing);
router.delete("/pricing/delete/:id", verifyToken, deletePricing);

// User Routes
router.post("/user/create", register);
router.post("/user/login", login);
router.get("/user/me", verifyToken, checkPlanValidation, checkActiveUser, me);
router.get(
  "/user/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  userDetail
);
router.put(
  "/user/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  updateuser
);

module.exports = router;
