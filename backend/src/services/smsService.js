const axios = require("axios");
const { query } = require("../config/db");
const { formatPriceToman, jDate, toFaDigits, toEnDigits } = require("../utils/helpers");

// ─────────────── پیکربندی ملی‌پیامک ───────────────
// روش اصلی: کنسول ملی‌پیامک (REST + Auth Token)
//   POST https://console.melipayamak.com/api/send/simple/{token}
//   body: { to, from, text }  →  پاسخ: { recId, status }
// روش جایگزین: وب‌سرویس کلاسیک با Username/Password
//   POST https://rest.payamak-panel.com/api/SendSMS/SendSMS

const CONSOLE_API_URL = "https://console.melipayamak.com/api/send/simple";
const CONSOLE_SHARED_API_URL = "https://console.melipayamak.com/api/send/shared";
const CONSOLE_TIMEOUT_MS = 30000;
const CLASSIC_TIMEOUT_MS = 30000;
const SHARED_RETRY_COUNT = 2;

let melipayamakApi = null; // نمونه کلاسیک (fallback)

function apiToken() {
  return (process.env.MELIPAYAMAK_API_TOKEN || "").trim();
}

function hasCredentials() {
  return Boolean(
    (process.env.MELIPAYAMAK_USERNAME || "").trim() &&
      (process.env.MELIPAYAMAK_PASSWORD || "").trim()
  );
}

function melipayamakSender() {
  return (process.env.MELIPAYAMAK_SENDER || "").trim();
}

function normalizePhoneForSms(phone) {
  const digits = toEnDigits(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("98")) return `0${digits.slice(2)}`;
  if (digits.startsWith("+98")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  if (digits.length === 10) return `0${digits}`;
  return digits;
}

// شبیه‌سازی فقط زمانی فعال است که صریحاً با SMS_SIMULATE=1 خواسته شده باشد
function simulateEnabled() {
  return process.env.SMS_SIMULATE === "1";
}

// آیا ملی‌پیامک به‌درستی پیکربندی شده است؟
function smsEnabled() {
  if (simulateEnabled()) return false;
  return Boolean(apiToken() || hasCredentials());
}

function initMelipayamakFallback() {
  try {
    if (melipayamakApi !== null) return true;
    if (!hasCredentials()) return false;
    const MelipayamakApi = require("melipayamak");
    melipayamakApi = new MelipayamakApi(
      process.env.MELIPAYAMAK_USERNAME.trim(),
      process.env.MELIPAYAMAK_PASSWORD.trim()
    ).sms("rest", "async");
    return true;
  } catch (err) {
    console.error("خطا در راه‌اندازی سرویس کلاسیک ملی‌پیامک:", err.message);
    return false;
  }
}

async function logSms({ phone, message, type, reservationId = null, status = "SENT", errorMessage = null }) {
  await query(
    `INSERT INTO sms_logs (phone, message, type, reservation_id, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [phone, message, type, reservationId, status, errorMessage]
  );
}

// ارسال از طریق کنسول ملی‌پیامک (Auth Token) — متد simple
async function sendViaConsole(phone, sender, message) {
  const token = apiToken();
  const mobile = normalizePhoneForSms(phone);
  const body = { to: mobile, text: message };
  if (sender) body.from = sender;

  console.log(`[SMS] sendViaConsole: to=${mobile}, from=${sender || "auto"}`);
  const { data } = await axios.post(
    `${CONSOLE_API_URL}/${token}`,
    body,
    {
      timeout: CONSOLE_TIMEOUT_MS,
      headers: { "Content-Type": "application/json" },
    }
  );
  console.log(`[SMS] sendViaConsole response:`, JSON.stringify(data));

  const recId = data && (data.recId ?? data.id ?? data.recid ?? data.messageId);
  const status = data && (data.status ?? data.result ?? data.error ?? data.message);

  if (recId && String(recId) !== "0") {
    return { success: true, recId: String(recId) };
  }
  if (typeof data === "string" && /ok|success|sent/i.test(data)) {
    return { success: true, recId: data };
  }
  throw new Error(status || "پاسخ نامعتبر از کنسول ملی‌پیامک");
}

// ارسال از طریق کنسول ملی‌پیامک (Auth Token) — با متد shared (پترن خدماتی)
// پیام‌ها از مسیر ارسال «خدماتی» می‌روند و برای همه (حتی آن‌هایی که تبلیغاتی را
// بسته/بلک‌لیست کرده‌اند) ارسال می‌شود. این متد برای OTP باید در اولویت باشد.
async function sendViaShared(phone, bodyId, args) {
  const token = apiToken();
  const mobile = normalizePhoneForSms(phone);
  const body = { bodyId, to: mobile, args };
  console.log(`[SMS] sendViaShared (خدماتی): to=${mobile}, bodyId=${bodyId}, args=`, args);
  const { data } = await axios.post(
    `${CONSOLE_SHARED_API_URL}/${token}`,
    body,
    { timeout: CONSOLE_TIMEOUT_MS, headers: { "Content-Type": "application/json" } }
  );
  console.log(`[SMS] sendViaShared response:`, JSON.stringify(data));

  const recId = data && (data.recId ?? data.recid ?? data.id ?? data.Value);
  const status = data && (data.status ?? data.StrRetStatus ?? data.message);

  if (recId && String(recId) !== "0") {
    return { success: true, recId: String(recId) };
  }
  // برخی پاسخ‌ها recId ندارند اما status=1 یا ok دارند
  if (status && /ok|success|sent|1/i.test(String(status))) {
    return { success: true, recId: String(recId || status) };
  }
  throw new Error(status || "پاسخ نامعتبر از کنسول ملی‌پیامک (shared)");
}

// آیدی متن پیش‌فرض (پترن) تأییدشده برای کد تأیید – در .env تنظیم می‌شود
function otpBodyId() {
  return (process.env.MELIPAYAMAK_OTP_BODY_ID || "").trim();
}

// ارسال از طریق وب‌سرویس کلاسیک (Username/Password) — حالت تبلیغاتی
async function sendViaClassic(phone, sender, message) {
  if (!hasCredentials()) {
    throw new Error("ملی‌پیامک کلاسیک پیکربندی نشده است");
  }

  const mobile = normalizePhoneForSms(phone);
  const username = (process.env.MELIPAYAMAK_USERNAME || "").trim();
  const password = (process.env.MELIPAYAMAK_PASSWORD || "").trim();
  const payload = new URLSearchParams({
    username,
    password,
    to: mobile,
    from: sender || "",
    text: message,
    isflash: "false",
  });

  console.log(`[SMS] sendViaClassic (تبلیغاتی): to=${mobile}, from=${sender || "auto"}`);
  const { data } = await axios.post(
    "https://rest.payamak-panel.com/api/SendSMS/SendSMS",
    payload.toString(),
    {
      timeout: CLASSIC_TIMEOUT_MS,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    }
  );
  console.log(`[SMS] sendViaClassic response:`, JSON.stringify(data));

  const retStatus = data && (data.RetStatus ?? data.retStatus ?? data.status ?? data.Status);
  const strRetStatus = data && (data.StrRetStatus ?? data.strRetStatus ?? data.message ?? "");
  const value = data && (data.Value ?? data.value ?? data.recId ?? data.recid);

  const ok = Number(retStatus) === 1 || String(strRetStatus).toLowerCase() === "ok" || String(value).length > 0;
  if (ok) {
    return { success: true, recId: String(value || "") };
  }

  throw new Error(`خطای ملی پیامک: ${strRetStatus || JSON.stringify(data) || "نامشخص"}`);
}

// ارسال از طریق وب‌سرویس کلاسیک (Username/Password) — حالت خدماتی (پترن)
// از متد BaseServiceNumber استفاده می‌کند که پیام از مسیر خدماتی ارسال می‌شود
// و حتی برای گیرنده‌هایی که تبلیغاتی را بسته‌اند نیز ارسال می‌شود.
// endpoint: POST https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber
// نکته: فیلد text مقدار جایگزین {0} در پترن را مشخص می‌کند (نه arg0)
async function sendViaClassicService(phone, bodyId, code) {
  if (!hasCredentials()) {
    throw new Error("ملی‌پیامک کلاسیک پیکربندی نشده است");
  }

  const mobile = normalizePhoneForSms(phone);
  const username = (process.env.MELIPAYAMAK_USERNAME || "").trim();
  const password = (process.env.MELIPAYAMAK_PASSWORD || "").trim();
  const payload = new URLSearchParams({
    username,
    password,
    to: mobile,
    text: String(code),
    bodyId: String(bodyId),
  });

  console.log(`[SMS] sendViaClassicService (کلاسیک-خدماتی): to=${mobile}, bodyId=${bodyId}, text=${code}`);
  const { data } = await axios.post(
    "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber",
    payload.toString(),
    {
      timeout: CLASSIC_TIMEOUT_MS,
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    }
  );
  console.log(`[SMS] sendViaClassicService response:`, JSON.stringify(data));

  const retStatus = data && (data.RetStatus ?? data.retStatus ?? data.status ?? data.Status);
  const strRetStatus = data && (data.StrRetStatus ?? data.strRetStatus ?? data.message ?? "");
  const value = data && (data.Value ?? data.value ?? data.recId ?? data.recid);

  const ok = Number(retStatus) === 1 || String(strRetStatus).toLowerCase() === "ok" || String(value).length > 0;
  if (ok) {
    return { success: true, recId: String(value || "") };
  }

  throw new Error(`خطای ملی پیامک (BaseServiceNumber): ${strRetStatus || JSON.stringify(data) || "نامشخص"}`);
}

function errorMessage(err) {
  return (
    (err && err.response && err.response.data && (err.response.data.status || err.response.data.error)) ||
    (err && err.message) ||
    "خطای ناشناخته ملی پیامک"
  );
}

async function sendSms(phone, message, { type = "CUSTOM", reservationId = null } = {}) {
  const normalizedPhone = normalizePhoneForSms(phone);

  if (simulateEnabled()) {
    await logSms({ phone: normalizedPhone, message, type, reservationId, status: "SENT" });
    return { simulated: true, success: true };
  }

  if (!smsEnabled()) {
    const msg = "ملی‌پیامک پیکربندی نشده است (توکن یا نام کاربری/رمز عبور را در .env تنظیم کنید)";
    console.error("خطا در ارسال پیامک به", normalizedPhone, ":", msg);
    await logSms({ phone: normalizedPhone, message, type, reservationId, status: "FAILED", errorMessage: msg });
    return { success: false, simulated: false, error: msg };
  }

  const sender = melipayamakSender();
  const errors = {};

  // روش اول: وب‌سرویس کلاسیک (Username/Password) — قابل‌اطمینان‌ترین روش
  if (hasCredentials()) {
    try {
      const result = await sendViaClassic(normalizedPhone, sender, message);
      await logSms({ phone: normalizedPhone, message, type, reservationId, status: "SENT" });
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.classic = errorMessage(err);
      console.error("ارسال از طریق سرویس کلاسیک ملی‌پیامک ناموفق بود:", errors.classic);
    }
  }

  // روش دوم: کنسول (Auth Token)
  if (apiToken()) {
    try {
      const result = await sendViaConsole(normalizedPhone, sender, message);
      await logSms({ phone: normalizedPhone, message, type, reservationId, status: "SENT" });
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.console = errorMessage(err);
      console.error("ارسال از طریق کنسول ملی‌پیامک ناموفق بود:", errors.console);
    }
  }

  const msg = errors.classic || errors.console || "خطای ناشناخته ملی پیامک";
  console.error("خطا در ارسال پیامک به", normalizedPhone, ":", msg);
  await logSms({ phone: normalizedPhone, message, type, reservationId, status: "FAILED", errorMessage: msg });
  return { success: false, simulated: false, error: msg };
}

// ---------- قالب‌های پیامک ----------

function otpMessage(code) {
  return `مهمان گرامی هتل باغ سرهنگ کد تایید شما ${toFaDigits(code)} می باشد`;
}

function reservationConfirmedMessage(guestName, reservationNumber, roomName, checkIn, checkOut, nights, totalPrice) {
  return `سلام ${guestName}! رزرو شما با موفقیت ثبت شد.\n✓ شماره رزرو: ${reservationNumber}\n✓ اتاق: ${roomName}\n✓ ورود: ${jDate(checkIn)}\n✓ خروج: ${jDate(checkOut)} (${toFaDigits(nights)} شب)\n✓ مبلغ: ${formatPriceToman(totalPrice)}\n☎️ تماس: 09112106640\nهتل باغ سرهنگ`;
}

function paymentConfirmedMessage(reservationNumber, totalPrice) {
  return `تأیید پرداخت رزرو ${reservationNumber}\nمبلغ: ${formatPriceToman(totalPrice)}\nوضعیت: ✓ پرداخت شد\nتشکر از انتخاب هتل باغ سرهنگ`;
}

function checkInDayMessage(reservationNumber, roomName) {
  return `خوش آمدید! امروز شما می‌توانید ساعت 14:00 ثبت‌نام کنید.\nرزرو: ${reservationNumber}\nاتاق: ${roomName}\nتلفن پذیرایی: 09112106640\nهتل باغ سرهنگ`;
}

function checkOutMessage(reservationNumber) {
  return `سپاس از اقامت شما در هتل باغ سرهنگ!\nرزرو: ${reservationNumber}\nاگر سوالی دارید: 09112106640`;
}

function cancellationRequestedMessage(reservationNumber, roomName, totalPrice) {
  return `درخواست لغو رزرو ${reservationNumber}\nاتاق: ${roomName}\nمبلغ: ${formatPriceToman(totalPrice)}\nوضعیت: در انتظار بررسی مدیریت\nهتل باغ سرهنگ`;
}

function refundCompletedMessage(reservationNumber, totalPrice) {
  return `بازپرداخت رزرو ${reservationNumber}\nمبلغ: ${formatPriceToman(totalPrice)}\nوضعیت: واریز انجام شد\nاز انتخاب هتل باغ سرهنگ سپاسگزاریم`;
}

function cancellationRejectedMessage(reservationNumber, reason) {
  return `درخواست لغو رزرو ${reservationNumber}\nوضعیت: رد شد\nدلیل: ${reason || 'بدون دلیل'}\nهتل باغ سرهنگ`;
}

async function sendOtp(phone, code) {
  const normalizedPhone = normalizePhoneForSms(phone);
  const message = otpMessage(code);

  if (simulateEnabled()) {
    await logSms({ phone: normalizedPhone, message, type: "OTP", status: "SENT" });
    return { simulated: true, success: true };
  }

  if (!smsEnabled()) {
    const msg = "ملی‌پیامک پیکربندی نشده است";
    console.error(`[SMS] ${msg}`);
    await logSms({ phone: normalizedPhone, message, type: "OTP", status: "FAILED", errorMessage: msg });
    return { success: false, simulated: false, error: msg };
  }

  const bodyId = otpBodyId();
  const sender = melipayamakSender();
  const errors = {};

  // ─── اولویت ۱: ارسال خدماتی از طریق API کلاسیک (BaseServiceNumber) ───
  // کنسول API از سرور فعلی unreachable هست، ولی rest.payamak-panel.com کار میکنه
  // BaseServiceNumber پیام را از مسیر خدماتی ارسال می‌کند و به همه می‌رسد
  if (hasCredentials() && bodyId) {
    for (let attempt = 1; attempt <= SHARED_RETRY_COUNT; attempt++) {
      try {
        const result = await sendViaClassicService(normalizedPhone, bodyId, code);
        await logSms({ phone: normalizedPhone, message, type: "OTP", status: "SENT" });
        console.log(`[SMS] ✅ OTP sent via CLASSIC-SERVICE (کلاسیک-خدماتی) to ${normalizedPhone}, bodyId=${bodyId}, recId=${result.recId} (attempt ${attempt})`);
        return { success: true, simulated: false, ...result };
      } catch (err) {
        errors[`classic_service_attempt_${attempt}`] = errorMessage(err);
        console.error(`[SMS] CLASSIC-SERVICE attempt ${attempt}/${SHARED_RETRY_COUNT} failed for ${normalizedPhone} bodyId=${bodyId}:`, errorMessage(err));
        if (attempt < SHARED_RETRY_COUNT) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
  }

  // ─── اولویت ۲: ارسال خدماتی از طریق کنسول (shared) — اگر کنسول API در دسترس باشد ───
  if (apiToken() && bodyId) {
    for (let attempt = 1; attempt <= SHARED_RETRY_COUNT; attempt++) {
      try {
        const result = await sendViaShared(normalizedPhone, Number(bodyId), [String(code)]);
        await logSms({ phone: normalizedPhone, message, type: "OTP", status: "SENT" });
        console.log(`[SMS] ✅ OTP sent via SHARED (خدماتی کنسول) to ${normalizedPhone}, bodyId=${bodyId}, recId=${result.recId} (attempt ${attempt})`);
        return { success: true, simulated: false, ...result };
      } catch (err) {
        errors[`shared_attempt_${attempt}`] = errorMessage(err);
        console.error(`[SMS] SHARED attempt ${attempt}/${SHARED_RETRY_COUNT} failed for ${normalizedPhone} bodyId=${bodyId}:`, errorMessage(err));
        if (attempt < SHARED_RETRY_COUNT) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
  }

  // ─── اولویت ۳: کنسول simple (تبلیغاتی) — فقط fallback اگر خدماتی شکست خورد ───
  if (apiToken()) {
    try {
      const result = await sendViaConsole(normalizedPhone, sender, message);
      await logSms({ phone: normalizedPhone, message, type: "OTP", status: "SENT" });
      console.log(`[SMS] ⚠️ OTP sent via CONSOLE (تبلیغاتی fallback) to ${normalizedPhone}, recId=${result.recId}`);
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.console = errorMessage(err);
      console.error(`[SMS] CONSOLE (تبلیغاتی) failed for ${normalizedPhone}:`, errorMessage(err));
    }
  }

  // ─── اولویت ۴: سرویس کلاسیک تبلیغاتی — آخرین fallback ───
  if (hasCredentials()) {
    try {
      const result = await sendViaClassic(normalizedPhone, sender, message);
      await logSms({ phone: normalizedPhone, message, type: "OTP", status: "SENT" });
      console.log(`[SMS] ⚠️ OTP sent via CLASSIC (تبلیغاتی fallback) to ${normalizedPhone}, recId=${result.recId}`);
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.classic = errorMessage(err);
      console.error(`[SMS] CLASSIC (تبلیغاتی) failed for ${normalizedPhone}:`, errorMessage(err));
    }
  }

  const lastError = errors.classic_service_attempt_1 || errors.classic || errors.console || errors.shared_attempt_1 || "خطای ناشناخته ملی پیامک";
  console.error(`[SMS] ❌ All methods failed for ${normalizedPhone}:`, lastError);
  await logSms({ phone: normalizedPhone, message, type: "OTP", status: "FAILED", errorMessage: `All methods failed: ${lastError}` });
  return { success: false, simulated: false, error: "ارسال پیامک ناموفق بود" };
}

async function sendReservationConfirmed({ phone, guestName, reservationNumber, roomName, checkIn, checkOut, nights, totalPrice, reservationId }) {
  return sendSms(
    phone,
    reservationConfirmedMessage(guestName, reservationNumber, roomName, checkIn, checkOut, nights, totalPrice),
    { type: "RESERVATION_CONFIRMED", reservationId }
  );
}

async function sendPaymentConfirmed({ phone, reservationNumber, totalPrice, reservationId }) {
  return sendSms(phone, paymentConfirmedMessage(reservationNumber, totalPrice), {
    type: "PAYMENT_SUCCESS",
    reservationId,
  });
}

async function sendCheckInSms({ phone, reservationNumber, roomName, reservationId }) {
  return sendSms(phone, checkInDayMessage(reservationNumber, roomName), {
    type: "CHECK_IN",
    reservationId,
  });
}

async function sendCheckOutSms({ phone, reservationNumber, reservationId }) {
  return sendSms(phone, checkOutMessage(reservationNumber), {
    type: "CHECK_OUT",
    reservationId,
  });
}

async function sendCancellationRequestedSms({ phone, reservationNumber, roomName, totalPrice, reservationId }) {
  return sendSms(phone, cancellationRequestedMessage(reservationNumber, roomName, totalPrice), {
    type: "CANCELLATION_REQUESTED",
    reservationId,
  });
}

async function sendRefundCompletedSms({ phone, reservationNumber, totalPrice, reservationId }) {
  return sendSms(phone, refundCompletedMessage(reservationNumber, totalPrice), {
    type: "REFUND_COMPLETED",
    reservationId,
  });
}

async function sendCancellationRejectedSms({ phone, reservationNumber, reason, reservationId }) {
  return sendSms(phone, cancellationRejectedMessage(reservationNumber, reason), {
    type: "CANCELLATION_REJECTED",
    reservationId,
  });
}

module.exports = {
  smsEnabled,
  simulateEnabled,
  sendSms,
  sendOtp,
  sendReservationConfirmed,
  sendPaymentConfirmed,
  sendCheckInSms,
  sendCheckOutSms,
  sendCancellationRequestedSms,
  sendRefundCompletedSms,
  sendCancellationRejectedSms,
  logSms,
};
