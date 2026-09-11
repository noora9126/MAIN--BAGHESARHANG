const express = require("express");
const router = express.Router();

const {
  requestPaymentController,
  verifyPaymentController,
  manualConfirmPayment,
} = require("../controllers/paymentController");
const {
  createVarizaPaymentController,
  varizaWebhookController,
  varizaPaymentStatusController,
  varizaConfigStatusController,
} = require("../controllers/paymentController");
const { varizaCreateLimiter } = require("../middleware/rateLimiters");

// ── زرین‌پال (legacy) ──
router.post("/request", requestPaymentController);
router.get("/verify", verifyPaymentController);
router.post("/manual-confirm", manualConfirmPayment);

// ── واریزا (پرداخت کارت‌به‌کارت) ──
// ساخت لینک پرداخت برای سفارش (مبلغ از دیتابیس خوانده می‌شود)
router.post("/variza/create", varizaCreateLimiter, createVarizaPaymentController);

// Webhook رسمی واریزا — عمومی، فقط با امضای HMAC-SHA256 معتبر پذیرفته می‌شود.
// ⚠️ آدرس این endpoint باید یک‌بار در پنل واریزا (پروفایل ← callback_url) ثبت شود.
router.post("/variza/webhook", varizaWebhookController);

// وضعیت واقعی پرداخت/سفارش برای Return URL و Polling
router.get("/variza/status", varizaPaymentStatusController);

// تشخیص تنظیم بودن درگاه (فقط boolean — بدون هیچ Secret)
router.get("/variza/config-status", varizaConfigStatusController);

module.exports = router;
