const express = require("express");
const router = express.Router();

const { authCustomer, authResetToken } = require("../middleware/auth");
const { customerLoginLimiter, customerRegisterLimiter, customerForgotLimiter } = require("../middleware/rateLimiters");
const {
  validateRegister,
  validateLogin,
  validateOtpCode,
  validateNewPassword,
  validateProfileUpdate,
  validatePhone,
} = require("../middleware/validate");

const customerAuth = require("../controllers/customerAuthController");

// ─────────────── احراز هویت ───────────────
router.post("/auth/register", customerRegisterLimiter, validateRegister, customerAuth.register);
router.post("/auth/register/verify", validateOtpCode, customerAuth.verifyRegister);
router.post("/auth/register/resend", customerForgotLimiter, validatePhone, customerAuth.resendRegisterCode);
router.post("/auth/login", customerLoginLimiter, validateLogin, customerAuth.login);
router.post("/auth/forgot-password", customerForgotLimiter, validatePhone, customerAuth.forgotPassword);
router.post("/auth/forgot-password/verify", validateOtpCode, customerAuth.verifyForgotOtp);
router.post("/auth/reset-password", authResetToken, validateNewPassword, customerAuth.resetPassword);
router.post("/auth/logout", authCustomer, customerAuth.logout);

// ─────────────── پروفایل (نیازمند ورود) ───────────────
router.get("/me", authCustomer, customerAuth.me);
router.put("/me", authCustomer, validateProfileUpdate, customerAuth.updateProfile);
router.post("/change-password", authCustomer, validateNewPassword, customerAuth.changePassword);

// ─────────────── رزروهای من ───────────────
router.get("/reservations", authCustomer, customerAuth.getMyReservations);
router.get("/reservations/:id", authCustomer, customerAuth.getReservationDetail);
router.get("/reservations/:id/cancellation-eligibility", authCustomer, customerAuth.getCancellationEligibility);
router.post("/reservations/:id/cancel", authCustomer, customerAuth.cancelReservation);

// ─────────────── اعلان‌ها ───────────────
router.get("/notifications", authCustomer, customerAuth.getNotifications);
router.post("/notifications/:id/read", authCustomer, customerAuth.markNotificationRead);
router.post("/notifications/read-all", authCustomer, customerAuth.markAllNotificationsRead);

// ─────────────── آمار داشبورد ───────────────
router.get("/stats", authCustomer, customerAuth.getDashboardStats);

module.exports = router;
