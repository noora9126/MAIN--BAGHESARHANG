const MelipayamakApi = require("melipayamak-api");
const { query } = require("../config/db");
const { formatPriceToman, jDate, toFaDigits } = require("../utils/helpers");

let melipayamakApi = null;
let smsService = null;

function initMelipayamak() {
  try {
    const username = process.env.MELIPAYAMAK_USERNAME || "";
    const password = process.env.MELIPAYAMAK_PASSWORD || "";
    
    if (!username || !password) {
      return false;
    }
    
    melipayamakApi = new MelipayamakApi(username, password);
    smsService = melipayamakApi.sms();
    return true;
  } catch (err) {
    console.error("خطا در راه‌اندازی ملی پیامک:", err.message);
    return false;
  }
}

function melipayamakSender() {
  return process.env.MELIPAYAMAK_SENDER || "هتل_باغ_سرهنگ";
}

// در صورت موجود بودن Username و Password، ملی‌پیامک فعال می‌شود
function smsEnabled() {
  if (melipayamakApi === null) {
    return initMelipayamak();
  }
  return melipayamakApi !== null;
}

async function logSms({ phone, message, type, reservationId = null, status = "SENT", errorMessage = null }) {
  await query(
    `INSERT INTO sms_logs (phone, message, type, reservation_id, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [phone, message, type, reservationId, status, errorMessage]
  );
}

async function sendSms(phone, message, { type = "CUSTOM", reservationId = null } = {}) {
  // اگر ملی‌پیامک فعال نیست، شبیه‌سازی کنیم
  if (!smsEnabled()) {
    await logSms({ phone, message, type, reservationId, status: "SENT" });
    return { simulated: true, success: true };
  }

  try {
    const sender = melipayamakSender();
    // متد send یک Promise برمی‌گرداند که RecId یا Error Number را بازمی‌دهد
    const recId = await smsService.send(phone, sender, message);
    
    // بررسی پاسخ: RecId یک عدد مثبت است، 0 یا -1 خطا است
    if (recId && parseInt(recId) > 0) {
      await logSms({ phone, message, type, reservationId, status: "SENT" });
      return { success: true, simulated: false, recId };
    } else {
      const errorMsg = `خطای ملی پیامک: کد ${recId}`;
      throw new Error(errorMsg);
    }
  } catch (err) {
    const msg = err.message || "خطای ناشناخته ملی پیامک";
    console.error("خطا در ارسال پیامک به", phone, ":", msg);
    await logSms({ phone, message, type, reservationId, status: "FAILED", errorMessage: msg });
    return { success: false, simulated: false, error: msg };
  }
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
  sendSms,
  sendOtp,
  sendReservationConfirmed,
  sendPaymentConfirmed,
  sendCheckInSms,
  sendCheckOutSms,
  logSms,
};
