const express = require("express");
const router = express.Router();
const { unifiedLoginLimiter } = require("../middleware/rateLimiters");
const authController = require("../controllers/authController");

router.post("/login", unifiedLoginLimiter, authController.login);

module.exports = router;
