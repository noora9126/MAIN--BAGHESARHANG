const { query } = require("../config/db");

const TODAY = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

// ─────────────── اعتبارسنجی و اعمال کد تخفیف ───────────────
// خروجی: { code, percent, amount, reason } یا throw با پیام فارسی
const applyDiscountByCode = async ({ code, phone, totalPrice }) => {
  const cleanCode = String(code || "").trim().toUpperCase();
  if (!cleanCode) {
    return { code: null, percent: 0, amount: 0, reason: null };
  }

  const rows = await query(`SELECT * FROM discount_codes WHERE code = ? LIMIT 1`, [cleanCode]);
  const discount = rows[0];
  if (!discount) {
    const err = new Error("کد تخفیف معتبر نیست");
    err.status = 400;
    throw err;
  }
  if (!Number(discount.is_active)) {
    const err = new Error("این کد تخفیف غیرفعال است");
    err.status = 400;
    throw err;
  }

  const today = TODAY();
  if (discount.valid_from && discount.valid_from > today) {
    const err = new Error("این کد تخفیف هنوز فعال نشده است");
    err.status = 400;
    throw err;
  }
  if (discount.valid_until && discount.valid_until < today) {
    const err = new Error("این کد تخفیف منقضی شده است");
    err.status = 400;
    throw err;
  }
  if (discount.usage_limit !== null && Number(discount.used_count) >= Number(discount.usage_limit)) {
    const err = new Error("سقف استفاده از این کد تخفیف به پایان رسیده است");
    err.status = 400;
    throw err;
  }

  // محدودیت به مشتریان خاص (لیست شماره‌ها)
  if (discount.customer_phones && String(discount.customer_phones).trim()) {
    const phones = String(discount.customer_phones)
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const hasPhone = phone && phones.some((p) => p === phone);
    if (!hasPhone) {
      const err = new Error("این کد تخفیف فقط برای مشتریان منتخب فعال است");
      err.status = 400;
      throw err;
    }
  }

  const percent = Number(discount.discount_percent);
  const amount = Math.round((Number(totalPrice) * percent) / 100);

  return {
    code: cleanCode,
    percent,
    amount,
    reason: discount.reason || discount.description || null,
  };
};

// ─────────────── افزایش تعداد استفاده ───────────────
const incrementDiscountUsage = async (code) => {
  await query(`UPDATE discount_codes SET used_count = used_count + 1 WHERE code = ?`, [code]);
};

// ─────────────── کاهش تعداد استفاده (بعد از کنسلی) ───────────────
const decrementDiscountUsage = async (code) => {
  await query(
    `UPDATE discount_codes SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?`,
    [code]
  );
};

module.exports = { applyDiscountByCode, incrementDiscountUsage, decrementDiscountUsage };