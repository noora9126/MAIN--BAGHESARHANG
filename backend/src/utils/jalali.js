// تبدیل تاریخ میلادی به شمسی (الگوریتم استاندارد JDF)
function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let month, day;
  if (days < 186) {
    month = 1 + Math.floor(days / 31);
    day = 1 + (days % 31);
  } else {
    month = 7 + Math.floor((days - 186) / 30);
    day = 1 + ((days - 186) % 30);
  }
  return { year: jy, month, day };
}

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

// تبدیل تاریخ میلادی (Date یا رشته YYYY-MM-DD) به رشته شمسی "1403/09/15"
function toJalaliString(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return String(input || "");
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  const mm = String(j.month).padStart(2, "0");
  const dd = String(j.day).padStart(2, "0");
  return `${j.year}/${mm}/${dd}`;
}

function toJalaliMonthName(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return "";
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${JALALI_MONTHS[j.month - 1]} ${j.year}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${toJalaliString(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = {
  toJalali,
  toJalaliString,
  toJalaliMonthName,
  addDays,
  formatDateTime,
  JALALI_MONTHS,
};
