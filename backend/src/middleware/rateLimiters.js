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

// ساخت لینک پرداخت واریزا: حداکثر 20 در 10 دقیقه برای هر IP
const varizaCreateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تعداد درخواست‌های پرداخت زیاد است. کمی بعد تلاش کنید" },
});

// ورود مشتری: حداکثر 10 تلاش در 15 دقیقه برای هر IP
const customerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تلاش‌های ورود زیاد بود. ۱۵ دقیقه دیگر دوباره تلاش کنید." },
});

// ثبت‌نام مشتری: حداکثر 20 حساب در ساعت برای هر IP
const customerRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تعداد ثبت‌نام‌ها زیاد است. کمی بعد دوباره تلاش کنید." },
});

// ارسال مجدد کد (ثبت‌نام/فراموشی رمز): حداکثر 5 در 10 دقیقه برای هر IP
// + محدودیت هر شماره توسط otpLimiter در لایه سرویس اعمال می‌شود
const customerForgotLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const phone =
      String(req.body?.phone || req.body?.mobile || "").replace(/[\s-]/g, "");
    return phone ? `custotp:${phone}` : ipKeyGenerator(req.ip);
  },
  message: { success: false, message: "تعداد درخواست کد زیاد است. چند دقیقه دیگر دوباره تلاش کنید." },
});

// ورود یکپارچه: حداکثر 10 تلاش در 15 دقیقه
const unifiedLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "تلاش‌های ورود زیاد بود. ۱۵ دقیقه دیگر دوباره تلاش کنید." },
});

module.exports = {
  adminLoginLimiter,
  otpLimiter,
  adminSmsLimiter,
  varizaCreateLimiter,
  customerLoginLimiter,
  customerRegisterLimiter,
  customerForgotLimiter,
  unifiedLoginLimiter,
};
