const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

// ورود ادمین: حداکثر 5 تلاش در 15 دقیقه
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تلاش‌های ناموفق زیاد بود. 15 دقیقه دیگر تلاش کنید." },
});

// ارسال کد تایید: حداکثر 1 پیامک در دقیقه برای هر شماره
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const phone = String(req.body?.phone || "").replace(/[\s-]/g, "");
    return phone ? `otp:${phone}` : ipKeyGenerator(req.ip);
  },
  message: { success: false, message: "لطفاً یک دقیقه صبر کنید و دوباره تلاش کنید" },
});

// ارسال پیامک از پنل مدیریت: حداکثر 10 در 5 دقیقه
const adminSmsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تعداد پیامک‌های ارسالی بیش از حد مجاز است" },
});

module.exports = { adminLoginLimiter, otpLimiter, adminSmsLimiter };
