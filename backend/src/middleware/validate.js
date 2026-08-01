const {
  isValidPhone,
  isValidEmail,
  isValidNationalId,
  isValidPersianName,
  parseDateOnly,
  nightsBetween,
  toEnDigits,
} = require("../utils/helpers");

function badRequest(res, message) {
  return res.status(400).json({ success: false, message });
}

// اعتبارسنجی فرم رزرو
function validateReservationInput(req, res, next) {
  const { roomId, checkIn, checkOut, numberOfGuests, guestName, guestEmail, nationalId } = req.body || {};

  if (!roomId || isNaN(Number(roomId))) {
    return badRequest(res, "شناسه اتاق نامعتبر است");
  }

  const ci = parseDateOnly(checkIn);
  const co = parseDateOnly(checkOut);
  if (!ci || !co) {
    return badRequest(res, "تاریخ ورود یا خروج نامعتبر است");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (ci < today) {
    return badRequest(res, "تاریخ ورود نمی‌تواند در گذشته باشد");
  }
  if (co <= ci) {
    return badRequest(res, "تاریخ خروج باید بعد از تاریخ ورود باشد");
  }

  const nights = nightsBetween(ci, co);
  if (nights < 1 || nights > 90) {
    return badRequest(res, "مدت اقامت باید بین 1 تا 90 شب باشد");
  }

  if (!numberOfGuests || isNaN(Number(numberOfGuests)) || Number(numberOfGuests) < 1) {
    return badRequest(res, "تعداد مهمانان نامعتبر است");
  }

  // نام و نام خانوادگی: حداقل 2 کلمه، فقط حروف فارسی
  if (!isValidPersianName(guestName)) {
    return badRequest(res, "نام و نام خانوادگی را کامل و به فارسی وارد کنید (نام و نام خانوادگی)");
  }

  if (!isValidEmail(guestEmail)) {
    return badRequest(res, "ایمیل معتبر وارد کنید");
  }

  // کد ملی: الزامی و مطابق الگوریتم ثبت احوال
  const normalizedNationalId = toEnDigits(nationalId).trim();
  if (!isValidNationalId(normalizedNationalId)) {
    return badRequest(res, "کد ملی معتبر وارد کنید (کد ملی ۱۰ رقمی خود را بررسی کنید)");
  }

  req.booking = {
    roomId: Number(roomId),
    checkIn: ci,
    checkOut: co,
    numberOfNights: nights,
    numberOfGuests: Number(numberOfGuests),
    guestName: String(guestName).trim().slice(0, 100),
    guestEmail: String(guestEmail).trim().toLowerCase().slice(0, 100),
    nationalId: normalizedNationalId,
    specialRequests: String(req.body.specialRequests || "").slice(0, 1000),
  };

  next();
}

// اعتبارسنجی شماره موبایل
function validatePhone(req, res, next) {
  const phone = (req.body.phone || "").replace(/[\s-]/g, "");
  if (!isValidPhone(phone)) {
    return badRequest(res, "شماره موبایل معتبر وارد کنید (11 رقم، با 09 شروع شود)");
  }
  req.body.phone = phone;
  next();
}

// اعتبارسنجی کد تایید
function validateOtpCode(req, res, next) {
  const { sessionId, code } = req.body || {};
  if (!sessionId) {
    return badRequest(res, "شناسه جلسه نامعتبر است");
  }
  if (!/^\d{6}$/.test(String(code || ""))) {
    return badRequest(res, "کد تأیید باید 6 رقم باشد");
  }
  next();
}

module.exports = { validateReservationInput, validatePhone, validateOtpCode };
