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
