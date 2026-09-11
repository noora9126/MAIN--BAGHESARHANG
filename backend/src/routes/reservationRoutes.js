const express = require("express");
const router = express.Router();

const {
  createReservation,
  verifyPhone,
  verifyCode,
  attachVerifiedPhone,
  getReservation,
} = require("../controllers/reservationController");
const { validateDiscount } = require("../controllers/discountController");
const { validateReservationInput, validatePhone, validateOtpCode } = require("../middleware/validate");
const { otpLimiter } = require("../middleware/rateLimiters");
const { authCustomer } = require("../middleware/auth");

// رزرو فقط برای مشتریان ثبت‌نام‌کرده و وارد‌شده امکان‌پذیر است
router.post("/", authCustomer, validateReservationInput, createReservation);
router.get("/:id", getReservation);
router.post("/discount/validate", validateDiscount);

router.post("/verify-phone", authCustomer, otpLimiter, validatePhone, verifyPhone);
router.post("/verify-code", authCustomer, validateOtpCode, verifyCode);
router.post("/attach-phone", authCustomer, validatePhone, attachVerifiedPhone);

module.exports = router;
