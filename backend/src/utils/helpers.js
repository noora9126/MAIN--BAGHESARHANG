const crypto = require("crypto");

const { toJalaliString } = require("./jalali");

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

// "4,250,000" -> "۴٬۲۵۰٬۰۰۰"
function formatPriceToman(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString("fa-IR") + " تومان";
}

function formatPrice(amount) {
  return (Number(amount) || 0).toLocaleString("fa-IR");
}

function toFaDigits(str) {
  return String(str).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

// تاریخ شمسی: "1403/09/15"
function jDate(input) {
  return toJalaliString(input);
}

function isValidPhone(phone) {
  return /^09\d{9}$/.test(String(phone || ""));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

// نرمال‌سازی ارقام فارسی/عربی به انگلیسی
function toEnDigits(value) {
  const map = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return String(value || "").replace(/[۰-۹٠-٩]/g, (d) => map[d] ?? d);
}

// اعتبارسنجی کد ملی (الگوریتم استاندارد سازمان ثبت احوال - Mod 11)
function isValidNationalId(id) {
  const str = toEnDigits(id).trim();
  if (!/^\d{10}$/.test(str)) return false;
  // کدهایی که همه ارقام یکسان هستند نامعتبرند
  if (/^(\d)\1{9}$/.test(str)) return false;

  const digits = str.split("").map(Number);
  const checkDigit = digits[9];
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const rem = sum % 11;
  return rem < 2 ? checkDigit === rem : checkDigit === 11 - rem;
}

// نام فارسی معتبر: حداقل 2 کلمه و فقط حروف فارسی/عربی
function isValidPersianName(name) {
  const str = String(name || "").trim();
  if (str.length < 3 || str.length > 100) return false;
  if (!/^[\u0600-\u06FF\s]+$/.test(str)) return false;
  return str.split(/\s+/).filter(Boolean).length >= 2;
}

// نسل شماره رزرو: RES-20241215-001
function buildReservationNumber(dateStr, seq) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `RES-${y}${m}${day}-${String(seq).padStart(3, "0")}`;
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function sanitizeString(value, maxLen = 500) {
  if (value == null) return "";
  return String(value)
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

// تبدیل تاریخ YYYY-MM-DD به Date (نیمه‌شب به وقت محلی)
function parseDateOnly(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateOnlyString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));
}

module.exports = {
  formatPriceToman,
  formatPrice,
  toFaDigits,
  toEnDigits,
  jDate,
  isValidPhone,
  isValidEmail,
  isValidNationalId,
  isValidPersianName,
  buildReservationNumber,
  generateOtpCode,
  sanitizeString,
  parseDateOnly,
  dateOnlyString,
  nightsBetween,
};
