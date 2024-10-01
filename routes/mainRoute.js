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
  appUserDetails,
  changeUserPassword,
  downloadUserAttendance,
  calculateSalary,
  userAttendance,
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
router.get("/user/app/home", verifyToken, checkPlanValidation, checkActiveUser, appUserDetails);
router.get(
  "/user/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  userDetail
);

router.get(
  "/user/attendance_detail/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  userAttendance
);

router.get(
  "/user/download/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  downloadUserAttendance
);

router.get(
  "/user/calculate/salary",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  calculateSalary
);
router.put(
  "/user/:id",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  updateuser
);

router.put(
  "/user/password/change_password",
  verifyToken,
  checkPlanValidation,
  checkActiveUser,
  changeUserPassword
);

module.exports = router;
