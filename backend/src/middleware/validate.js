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

function toNumberList(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((v) => Number(v));
  return [];
}

// اعتبارسنجی فرم رزرو
function validateReservationInput(req, res, next) {
  const {
    roomId,
    checkIn,
    checkOut,
    guestName,
    guestEmail,
    nationalId,
    numberOfAdults,
    numberOfChildren,
    childAges,
    guests,
  } = req.body || {};

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

  // ── تعداد مسافران: بزرگسال + کودک ──
  const adults = Number(numberOfAdults) || 1;
  const children = Number(numberOfChildren) || 0;
  if (adults < 1 || !Number.isInteger(adults)) {
    return badRequest(res, "تعداد بزرگسالان نامعتبر است");
  }
  if (children < 0 || !Number.isInteger(children)) {
    return badRequest(res, "تعداد کودکان نامعتبر است");
  }

  const ages = toNumberList(childAges);
  if (ages.length !== children) {
    return badRequest(res, "سن همه کودکان را مشخص کنید");
  }
  for (const age of ages) {
    if (!Number.isInteger(age) || age < 0 || age > 17) {
      return badRequest(res, "سن کودک نامعتبر است");
    }
  }

  const totalPersons = adults + children;
  if (totalPersons < 1) {
    return badRequest(res, "تعداد مسافران نامعتبر است");
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

  // ── مشخصات سایر مهمانان بزرگسال (برای تطبیق مدارک هنگام ورود) ──
  const guestList = [];
  const leadGuest = {
    name: String(guestName).trim().slice(0, 100),
    nationalId: normalizedNationalId,
  };
  const others = Array.isArray(guests) ? guests : [];
  if (others.length > adults - 1) {
    return badRequest(res, "تعداد مهمانان ثبت‌شده بیش از حد مجاز است");
  }
  for (const g of others) {
    const gName = String(g?.name || "").trim().slice(0, 100);
    const gNationalId = toEnDigits(g?.nationalId || "").trim();
    if (!isValidPersianName(gName)) {
      return badRequest(res, "نام و نام خانوادگی همه مهمانان را کامل و به فارسی وارد کنید");
    }
    if (!isValidNationalId(gNationalId)) {
      return badRequest(res, "کد ملی همه مهمانان معتبر وارد کنید (کد ملی ۱۰ رقمی)");
    }
    guestList.push({ name: gName, nationalId: gNationalId });
  }
  guestList.unshift(leadGuest);

  req.booking = {
    roomId: Number(roomId),
    checkIn: ci,
    checkOut: co,
    numberOfNights: nights,
    numberOfGuests: totalPersons,
    numberOfAdults: adults,
    numberOfChildren: children,
    childAges: ages,
    guests: guestList,
    guestName: leadGuest.name,
    guestEmail: String(guestEmail).trim().toLowerCase().slice(0, 100),
    nationalId: normalizedNationalId,
    specialRequests: String(req.body.specialRequests || "").slice(0, 1000),
    discountCode: String(req.body.discountCode || "").trim().slice(0, 50) || null,
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
