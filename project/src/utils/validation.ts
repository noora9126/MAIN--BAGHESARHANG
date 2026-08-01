const FA_DIGIT_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function toEnDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGIT_MAP[d] ?? d);
}

export function toFaDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

export function isValidNationalId(value: string): boolean {
  const str = toEnDigits(value).trim();
  if (!/^\d{10}$/.test(str)) return false;
  if (/^(\d)\1{9}$/.test(str)) return false;

  const digits = str.split('').map(Number);
  const checkDigit = digits[9];
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const rem = sum % 11;
  return rem < 2 ? checkDigit === rem : checkDigit === 11 - rem;
}

export function isValidPersianName(value: string): boolean {
  const str = value.trim();
  if (str.length < 3 || str.length > 100) return false;
  if (!/^[\u0600-\u06FF\s]+$/.test(str)) return false;
  return str.split(/\s+/).filter(Boolean).length >= 2;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
