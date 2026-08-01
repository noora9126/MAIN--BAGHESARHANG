const express = require("express");
const router = express.Router();

const {
  createReservation,
  verifyPhone,
  verifyCode,
  attachVerifiedPhone,
  getReservation,
} = require("../controllers/reservationController");
const { validateReservationInput, validatePhone, validateOtpCode } = require("../middleware/validate");
const { otpLimiter } = require("../middleware/rateLimiters");

router.post("/", validateReservationInput, createReservation);
router.get("/:id", getReservation);

router.post("/verify-phone", otpLimiter, validatePhone, verifyPhone);
router.post("/verify-code", validateOtpCode, verifyCode);
router.post("/attach-phone", validatePhone, attachVerifiedPhone);

module.exports = router;
