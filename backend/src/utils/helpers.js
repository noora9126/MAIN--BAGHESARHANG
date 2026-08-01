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

// نسل شماره رزرو: RES-20241215-001
function buildReservationNumber(dateStr, seq) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `RES-${y}${m}${day}-${String(seq).padStart(3, "0")}`;
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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
  jDate,
  isValidPhone,
  isValidEmail,
  buildReservationNumber,
  generateOtpCode,
  sanitizeString,
  parseDateOnly,
  dateOnlyString,
  nightsBetween,
};
