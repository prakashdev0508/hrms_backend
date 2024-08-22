const express = require("express");
const { homePageData } = require("../controller/homepage.controller");
const router = express.Router();

router.get("/home-page", homePageData)

module.exports = router;
