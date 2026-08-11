const { query } = require("../config/db");

// ─────────────── لیست تخفیف‌ها ───────────────
const listDiscounts = async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.*,
        (SELECT COUNT(*) FROM reservations r WHERE r.discount_code = d.code) AS reservation_count
       FROM discount_codes d
       ORDER BY d.created_at DESC`
    );
    res.json({ success: true, discounts: rows });
  } catch (err) {
    console.error("listDiscounts error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ساخت تخفیف جدید ───────────────
const createDiscount = async (req, res) => {
  try {
    const { code, discountPercent, description, reason, customerPhones, validFrom, validUntil, usageLimit } =
      req.body || {};

    const cleanCode = String(code || "").trim().toUpperCase();
    if (!cleanCode) {
      return res.status(400).json({ success: false, message: "کد تخفیف الزامی است" });
    }
    if (!/^[A-Za-z0-9\u0600-\u06FF_-]{2,50}$/.test(cleanCode)) {
      return res.status(400).json({ success: false, message: "فرمت کد تخفیف نامعتبر است" });
    }
    const percent = Number(discountPercent);
    if (isNaN(percent) || percent < 1 || percent > 100) {
      return res.status(400).json({ success: false, message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد" });
    }

    const dup = await query(`SELECT id FROM discount_codes WHERE code = ? LIMIT 1`, [cleanCode]);
    if (dup[0]) {
      return res.status(409).json({ success: false, message: "این کد تخفیف قبلاً ثبت شده است" });
    }

    const phones = Array.isArray(customerPhones)
      ? customerPhones.filter((p) => /^09\d{9}$/.test(String(p).trim())).join(",")
      : "";

    const result = await query(
      `INSERT INTO discount_codes
        (code, discount_percent, description, reason, customer_phones, valid_from, valid_until, usage_limit, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        cleanCode,
        percent,
        String(description || "").slice(0, 500),
        String(reason || "").slice(0, 255),
        phones,
        validFrom || null,
        validUntil || null,
        usageLimit ? Math.max(1, Number(usageLimit)) : null,
      ]
    );

    const created = await query(`SELECT * FROM discount_codes WHERE id = ? LIMIT 1`, [result.insertId]);
    res.status(201).json({ success: true, message: "کد تخفیف ایجاد شد", discount: created[0] });
  } catch (err) {
    console.error("createDiscount error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ویرایش تخفیف ───────────────
const updateDiscount = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM discount_codes WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "کد تخفیف یافت نشد" });
    }

    const { discountPercent, description, reason, customerPhones, validFrom, validUntil, usageLimit } =
      req.body || {};
    const updates = [];
    const params = [];

    if (discountPercent !== undefined) {
      const percent = Number(discountPercent);
      if (isNaN(percent) || percent < 1 || percent > 100) {
        return res.status(400).json({ success: false, message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد" });
      }
      updates.push("discount_percent = ?");
      params.push(percent);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(String(description).slice(0, 500));
    }
    if (reason !== undefined) {
      updates.push("reason = ?");
      params.push(String(reason).slice(0, 255));
    }
    if (customerPhones !== undefined) {
      const phones = Array.isArray(customerPhones)
        ? customerPhones.filter((p) => /^09\d{9}$/.test(String(p).trim())).join(",")
        : "";
      updates.push("customer_phones = ?");
      params.push(phones);
    }
    if (validFrom !== undefined) {
      updates.push("valid_from = ?");
      params.push(validFrom || null);
    }
    if (validUntil !== undefined) {
      updates.push("valid_until = ?");
      params.push(validUntil || null);
    }
    if (usageLimit !== undefined) {
      updates.push("usage_limit = ?");
      params.push(usageLimit ? Math.max(1, Number(usageLimit)) : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "موردی برای ویرایش وجود ندارد" });
    }

    params.push(id);
    await query(`UPDATE discount_codes SET ${updates.join(", ")} WHERE id = ?`, params);

    const updated = await query(`SELECT * FROM discount_codes WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: "کد تخفیف ویرایش شد", discount: updated[0] });
  } catch (err) {
    console.error("updateDiscount error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── فعال/غیرفعال کردن ───────────────
const toggleDiscount = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM discount_codes WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "کد تخفیف یافت نشد" });
    }
    const next = Number(rows[0].is_active) ? 0 : 1;
    await query(`UPDATE discount_codes SET is_active = ? WHERE id = ?`, [next, id]);
    res.json({
      success: true,
      message: next ? "کد تخفیف فعال شد" : "کد تخفیف غیرفعال شد",
      isActive: Boolean(next),
    });
  } catch (err) {
    console.error("toggleDiscount error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── حذف تخفیف ───────────────
const deleteDiscount = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM discount_codes WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "کد تخفیف یافت نشد" });
    }
    const used = await query(
      `SELECT COUNT(*) AS c FROM reservations WHERE discount_code = ? AND status <> 'CANCELLED'`,
      [rows[0].code]
    );
    if (used[0].c > 0) {
      return res.status(409).json({
        success: false,
        message: `این کد در ${used[0].c} رزرو استفاده شده است؛ به جای حذف، غیرفعالش کنید`,
      });
    }
    await query(`DELETE FROM discount_codes WHERE id = ?`, [id]);
    res.json({ success: true, message: "کد تخفیف حذف شد" });
  } catch (err) {
    console.error("deleteDiscount error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { listDiscounts, createDiscount, updateDiscount, toggleDiscount, deleteDiscount };