// تبدیل میلادی به شمسی (الگوریتم استاندارد JDF)
export function toJalali(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = month > 2 ? year + 1 : year;
  let days = 355666 + 365 * year + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + day + g_d_m[month - 1];
  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let m: number, d: number;
  if (days < 186) {
    m = 1 + Math.floor(days / 31);
    d = 1 + (days % 31);
  } else {
    m = 7 + Math.floor((days - 186) / 30);
    d = 1 + ((days - 186) % 30);
  }
  return { year: jy, month: m, day: d };
}

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export function jalaliString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date || '');
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.year}/${String(j.month).padStart(2, '0')}/${String(j.day).padStart(2, '0')}`;
}

export function jalaliFriendly(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return String(date || '');
  const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${j.day} ${MONTHS[j.month - 1]} ${j.year}`;
}

export function faNum(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
}

export function formatToman(n: number): string {
  return (Number(n) || 0).toLocaleString('fa-IR') + ' تومان';
}

export function nightsBetween(ci: string, co: string): number {
  const a = new Date(ci);
  const b = new Date(co);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysStr(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(dt?: string | null): string {
  if (!dt) return '—';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '—';
  return `${jalaliString(d)} ${faNum(String(d.getHours()).padStart(2, '0'))}:${faNum(String(d.getMinutes()).padStart(2, '0'))}`;
}

// ─────────────── تقویم شمسی کامل (بر پایه Intl — بدون نیاز به کتابخانه) ───────────────
// همه محاسبات روی UTC انجام می‌شود تا صرف‌نظر از منطقه زمانی سیستم، نتیجه یکسان باشد

const persianFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function jalaliParts(date: Date): { y: number; m: number; d: number } {
  const parts = persianFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { y: get('year'), m: get('month'), d: get('day') };
}

// اولین روز ماه شمسی که این تاریخ در آن قرار دارد
export function jalaliMonthStart(date: Date): Date {
  const { m } = jalaliParts(date);
  let cur = date;
  while (jalaliParts(cur).m === m) {
    cur = new Date(cur.getTime() - 86400000);
  }
  return new Date(cur.getTime() + 86400000);
}

// تعداد روزهای ماه شمسی
export function jalaliMonthLength(start: Date): number {
  const { m, y } = jalaliParts(start);
  let cur = start;
  let len = 0;
  while (jalaliParts(cur).m === m && jalaliParts(cur).y === y) {
    cur = new Date(cur.getTime() + 86400000);
    len += 1;
  }
  return len;
}

// جابه‌جایی یک ماه شمسی به جلو/عقب (برگشتی: اولین روز ماه هدف)
export function shiftJalaliMonth(start: Date, dir: 1 | -1): Date {
  const { y, m } = jalaliParts(start);
  let ty = y;
  let tm = m + dir;
  if (tm < 1) { tm = 12; ty -= 1; }
  if (tm > 12) { tm = 1; ty += 1; }
  let cur = new Date(start.getTime() + dir * 86400000);
  let guard = 0;
  while (guard < 70) {
    const p = jalaliParts(cur);
    if (p.y === ty && p.m === tm) return cur;
    cur = new Date(cur.getTime() + dir * 86400000);
    guard += 1;
  }
  return start;
}

export function jalaliMonthLabel(date: Date): string {
  const { y, m } = jalaliParts(date);
  return `${MONTHS[m - 1]} ${faNum(y)}`;
}

export function isoOfUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}
