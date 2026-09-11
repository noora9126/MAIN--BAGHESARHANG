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

// اعتبارسنجی شماره موبایل (فیلد phone یا mobile)
function validatePhone(req, res, next) {
  const raw = req.body.phone ?? req.body.mobile ?? "";
  const phone = String(raw).replace(/[\s-]/g, "");
  if (!isValidPhone(phone)) {
    return badRequest(res, "شماره موبایل معتبر وارد کنید (11 رقم، با 09 شروع شود)");
  }
  req.body.phone = phone;
  if ("mobile" in req.body) req.body.mobile = phone;
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

// ─────────────── اعتبارسنجی‌های حساب مشتری ───────────────

const PASSWORD_MIN = 8;

function validatePasswordStrength(password) {
  return (
    typeof password === "string" &&
    password.length >= PASSWORD_MIN &&
    password.length <= 100 &&
    /[A-Za-z\u0600-\u06FF]/.test(password) &&
    /\d/.test(password)
  );
}

// ثبت‌نام مشتری: fullName + mobile + password + username
function validateRegister(req, res, next) {
  const body = req.body || {};

  const fullName = String(body.fullName || "").trim();
  if (!isValidPersianName(fullName)) {
    return badRequest(res, "نام را کامل و معتبر وارد کنید");
  }

  const mobile = toEnDigits(body.mobile).replace(/[\s-]/g, "");
  if (!isValidPhone(mobile)) {
    return badRequest(res, "شماره موبایل معتبر وارد کنید (11 رقم، با 09 شروع شود)");
  }

  const password = String(body.password || "");
  if (!validatePasswordStrength(password)) {
    return badRequest(res, `رمز عبور باید حداقل ${PASSWORD_MIN} کاراکتر و شامل حروف و اعداد باشد`);
  }

  // نام کاربری: اختیاری ولی اگر وارد شد باید معتبر باشد
  let username = null;
  if (body.username) {
    username = String(body.username).trim().toLowerCase();
    // فقط حروف لاتین، اعداد، نقطه و خط زیر
    if (!/^[a-z0-9._]{3,30}$/.test(username)) {
      return badRequest(res, "نام کاربری باید ۳ تا ۳۰ کاراکتر و شامل حروف لاتین، اعداد، نقطه یا خط زیر باشد");
    }
  }

  req.customerBody = { fullName, mobile, password, username };
  next();
}

// ورود مشتری: mobile (یا username) + password
function validateLogin(req, res, next) {
  const body = req.body || {};

  const mobile = toEnDigits(body.mobile).replace(/[\s-]/g, "");
  const password = String(body.password || "");
  if (!password) {
    return badRequest(res, "رمز عبور را وارد کنید");
  }

  // اگر mobile شامل 09 باشد، شماره موبایل است وگرنه نام کاربری
  if (/^09\d{9}$/.test(mobile)) {
    req.customerBody = { mobile, password };
  } else {
    // نام کاربری - بدون ولیدیشن شماره موبایل
    const username = String(body.mobile || "").trim().toLowerCase();
    if (!username) {
      return badRequest(res, "نام کاربری یا شماره موبایل را وارد کنید");
    }
    req.customerBody = { mobile: username, password };
  }
  next();
}

// رمز عبور جدید (بازنشانی / تغییر)
function validateNewPassword(req, res, next) {
  const password = String((req.body || {}).password || "");
  if (!validatePasswordStrength(password)) {
    return badRequest(res, `رمز عبور باید حداقل ${PASSWORD_MIN} کاراکتر و شامل حروف و اعداد باشد`);
  }
  req.customerBody = { password };
  next();
}

// ویرایش پروفایل مشتری
function validateProfileUpdate(req, res, next) {
  const body = req.body || {};
  const updates = {};

  if (body.fullName !== undefined) {
    const fullName = String(body.fullName || "").trim();
    if (!isValidPersianName(fullName)) {
      return badRequest(res, "نام و نام خانوادگی را کامل و به فارسی وارد کنید");
    }
    updates.fullName = fullName;
  }

  if (body.email !== undefined) {
    const email = String(body.email || "").trim().toLowerCase();
    if (email && !isValidEmail(email)) {
      return badRequest(res, "ایمیل معتبر وارد کنید");
    }
    updates.email = email.slice(0, 100);
  }

  if (Object.keys(updates).length === 0) {
    return badRequest(res, "موردی برای ویرایش ارسال نشده است");
  }

  req.profileUpdates = updates;
  next();
}

module.exports = {
  validateReservationInput,
  validatePhone,
  validateOtpCode,
  validateRegister,
  validateLogin,
  validateNewPassword,
  validateProfileUpdate,
};
