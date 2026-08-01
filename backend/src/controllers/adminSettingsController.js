const { query } = require("../config/db");
const { sendSms } = require("../services/smsService");
const { saveSettingsFromDb } = require("../services/zarinpalService");
const { mapRoom } = require("../services/reservationService");

const DEFAULT_SETTINGS = {
  hotel_phone: "09112106640",
  hotel_phone2: "09392056082",
  hotel_email: "info@baghsarhang.ir",
  check_in_time: "14:00",
  check_out_time: "12:00",
  kavenegar_api_key: "",
  kavenegar_sender: "10004346",
  melipayamak_api_token: "",
  melipayamak_sender: "",
  zarinpal_merchant_id: "",
  zarinpal_sandbox: "1",
};

// ─────────────── دریافت تنظیمات ───────────────
const getSettings = async (req, res) => {
  try {
    const rows = await query(`SELECT setting_key, setting_value FROM settings`);
    const data = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      data[row.setting_key] = row.setting_value;
    }
    res.json({ success: true, settings: data });
  } catch (err) {
    console.error("getSettings error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ذخیره تنظیمات ───────────────
const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const allowed = Object.keys(DEFAULT_SETTINGS);

    for (const key of allowed) {
      if (body[key] !== undefined) {
        await query(
          `INSERT INTO settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
          [key, String(body[key])]
        );
      }
    }

    // اعمال فوری تنظیمات پرداخت
    await saveSettingsFromDb();

    res.json({ success: true, message: "تنظیمات ذخیره شد" });
  } catch (err) {
    console.error("updateSettings error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── پیامک تست ───────────────
const testSms = async (req, res) => {
  try {
    const phone = String(req.body.phone || "").trim();
    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "شماره موبایل معتبر وارد کنید" });
    }
    const message = "این یک پیامک تست از هتل باغ سرهنگ است. ✅";
    const result = await sendSms(phone, message, { type: "TEST" });
    res.json({
      success: result.success,
      message: result.success ? "پیامک تست ارسال شد" : "ارسال پیامک ناموفق بود",
      simulated: Boolean(result.simulated),
    });
  } catch (err) {
    console.error("testSms error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── لیست اتاق‌ها (برای مدیریت) ───────────────
const listRooms = async (req, res) => {
  try {
    const rows = await query(`SELECT * FROM rooms ORDER BY id ASC`);
    res.json({ success: true, rooms: rows.map(mapRoom) });
  } catch (err) {
    console.error("listRooms error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ویرایش اتاق (قیمت، توضیحات، تصویر، وضعیت) ───────────────
const updateRoom = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM rooms WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "اتاق یافت نشد" });
    }

    const { pricePerNight, name, description, image, images, status, capacity } = req.body || {};
    const updates = [];
    const params = [];

    if (pricePerNight !== undefined) {
      const price = Number(pricePerNight);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ success: false, message: "قیمت نامعتبر است" });
      }
      updates.push("price_per_night = ?");
      params.push(price);
    }
    if (name !== undefined) {
      updates.push("name = ?");
      params.push(String(name).trim().slice(0, 100));
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(String(description).slice(0, 2000));
    }
    if (image !== undefined) {
      updates.push("image = ?");
      params.push(String(image).slice(0, 500));
    }
    if (images !== undefined) {
      updates.push("images = ?");
      params.push(JSON.stringify(Array.isArray(images) ? images : []));
    }
    if (status !== undefined) {
      const s = String(status).toLowerCase();
      if (!["active", "inactive"].includes(s)) {
        return res.status(400).json({ success: false, message: "وضعیت نامعتبر است" });
      }
      updates.push("status = ?");
      params.push(s);
    }
    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (isNaN(cap) || cap < 1) {
        return res.status(400).json({ success: false, message: "ظرفیت نامعتبر است" });
      }
      updates.push("capacity = ?");
      params.push(cap);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "موردی برای ویرایش وجود ندارد" });
    }

    params.push(id);
    await query(`UPDATE rooms SET ${updates.join(", ")} WHERE id = ?`, params);

    const updated = await query(`SELECT * FROM rooms WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: "اتاق ویرایش شد", room: mapRoom(updated[0]) });
  } catch (err) {
    console.error("updateRoom error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { getSettings, updateSettings, testSms, listRooms, updateRoom };
