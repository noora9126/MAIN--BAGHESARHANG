const axios = require("axios");
const { query } = require("../config/db");
const { formatPriceToman, jDate, toFaDigits } = require("../utils/helpers");

// ─────────────── پیکربندی ملی‌پیامک ───────────────
// روش اصلی: کنسول ملی‌پیامک (REST + Auth Token)
//   POST https://console.melipayamak.com/api/send/simple/{token}
//   body: { to, from, text }  →  پاسخ: { recId, status }
// روش جایگزین: وب‌سرویس کلاسیک با Username/Password
//   POST https://rest.payamak-panel.com/api/SendSMS/SendSMS

const CONSOLE_API_URL = "https://console.melipayamak.com/api/send/simple";
const TIMEOUT_MS = 15000;

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

// ارسال از طریق کنسول ملی‌پیامک (Auth Token)
async function sendViaConsole(phone, sender, message) {
  const token = apiToken();
  const body = { to: phone, text: message };
  // اگر شماره ارسال‌کننده خالی باشد، خط پیش‌فرض اکانت استفاده می‌شود
  if (sender) body.from = sender;
  const { data } = await axios.post(
    `${CONSOLE_API_URL}/${token}`,
    body,
    { timeout: TIMEOUT_MS }
  );

  const recId = data && data.recId;
  const status = data && data.status;

  if (recId && String(recId) !== "0") {
    return { success: true, recId: String(recId) };
  }
  throw new Error(status || "پاسخ نامعتبر از کنسول ملی‌پیامک");
}

// ارسال از طریق وب‌سرویس کلاسیک (Username/Password) — حالت جایگزین
async function sendViaClassic(phone, sender, message) {
  if (!initMelipayamakFallback()) {
    throw new Error("ملی‌پیامک پیکربندی نشده است");
  }
  const data = await melipayamakApi.send(phone, sender, message);

  // پاسخ موفق وب‌سرویس کلاسیک: { Value, RetStatus: 1, StrRetStatus: "Ok" }
  const ok =
    data &&
    (Number(data.RetStatus ?? data.retStatus) === 1 ||
      String(data.StrRetStatus ?? data.strRetStatus ?? "").toLowerCase() === "ok");

  if (ok) {
    return { success: true, recId: String(data.Value ?? data.recId ?? "") };
  }
  const errCode = (data && (data.StrRetStatus ?? data.Error ?? data.error)) || "نامشخص";
  throw new Error(`خطای ملی پیامک: ${errCode}`);
}

function errorMessage(err) {
  return (
    (err && err.response && err.response.data && (err.response.data.status || err.response.data.error)) ||
    (err && err.message) ||
    "خطای ناشناخته ملی پیامک"
  );
}

async function sendSms(phone, message, { type = "CUSTOM", reservationId = null } = {}) {
  // حالت شبیه‌سازی (فقط برای توسعه/تست)
  if (simulateEnabled()) {
    await logSms({ phone, message, type, reservationId, status: "SENT" });
    return { simulated: true, success: true };
  }

  // در پروداکشن باید اعتبارنامه وجود داشته باشد
  if (!smsEnabled()) {
    const msg = "ملی‌پیامک پیکربندی نشده است (توکن یا نام کاربری/رمز عبور را در .env تنظیم کنید)";
    console.error("خطا در ارسال پیامک به", phone, ":", msg);
    await logSms({ phone, message, type, reservationId, status: "FAILED", errorMessage: msg });
    return { success: false, simulated: false, error: msg };
  }

  const sender = melipayamakSender();
  const errors = {};

  // روش اصلی: کنسول (Auth Token)
  if (apiToken()) {
    try {
      const result = await sendViaConsole(phone, sender, message);
      await logSms({ phone, message, type, reservationId, status: "SENT" });
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.console = errorMessage(err);
      console.error("ارسال از طریق کنسول ملی‌پیامک ناموفق بود، تلاش با روش کلاسیک:", errors.console);
    }
  }

  // روش جایگزین: وب‌سرویس کلاسیک (Username/Password)
  if (hasCredentials()) {
    try {
      const result = await sendViaClassic(phone, sender, message);
      await logSms({ phone, message, type, reservationId, status: "SENT" });
      return { success: true, simulated: false, ...result };
    } catch (err) {
      errors.classic = errorMessage(err);
      console.error("ارسال از طریق سرویس کلاسیک ملی‌پیامک ناموفق بود:", errors.classic);
    }
  }

  const msg = errors.classic || errors.console || "خطای ناشناخته ملی پیامک";
  console.error("خطا در ارسال پیامک به", phone, ":", msg);
  await logSms({ phone, message, type, reservationId, status: "FAILED", errorMessage: msg });
  return { success: false, simulated: false, error: msg };
}

// ---------- قالب‌های پیامک ----------

function otpMessage(code) {
  return `سلام! کد تأیید شماره تلفن شما: ${toFaDigits(code)}\nاین کد 10 دقیقه معتبر است.\nهتل باغ سرهنگ`;
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

async function sendOtp(phone, code) {
  return sendSms(phone, otpMessage(code), { type: "OTP" });
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

module.exports = {
  smsEnabled,
  simulateEnabled,
  sendSms,
  sendOtp,
  sendReservationConfirmed,
  sendPaymentConfirmed,
  sendCheckInSms,
  sendCheckOutSms,
  logSms,
};
