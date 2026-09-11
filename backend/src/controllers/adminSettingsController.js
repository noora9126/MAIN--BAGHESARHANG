const { query } = require("../config/db");
const { sendSms } = require("../services/smsService");
const { saveSettingsFromDb } = require("../services/zarinpalService");
const { mapRoom } = require("../services/reservationService");
const { createNotification } = require("../services/notificationService");

const DEFAULT_SETTINGS = {
  hotel_name: "هتل باغ سرهنگ",
  hotel_phone: "09112106640",
  hotel_phone2: "09392056082",
  hotel_email: "info@baghsarhang.ir",
  hotel_address: "بابل، بلوار امام رضا، هتل باغ سرهنگ",
  hotel_about: "",
  check_in_time: "14:00",
  check_out_time: "12:00",
  kavenegar_api_key: "",
  kavenegar_sender: "10004346",
  melipayamak_api_token: "",
  melipayamak_sender: "",
  zarinpal_merchant_id: "",
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

    createNotification({
      type: "ROOM_UPDATED",
      title: "اتاق ویرایش شد",
      message: `اتاق «${updated[0].name}» توسط مدیر ویرایش شد`,
      refType: "room",
      refId: id,
    });

    res.json({ success: true, message: "اتاق ویرایش شد", room: mapRoom(updated[0]) });
  } catch (err) {
    console.error("updateRoom error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── افزودن اتاق جدید ───────────────
const createRoom = async (req, res) => {
  try {
    const {
      name,
      pricePerNight,
      capacity,
      extraCapacity,
      type,
      area,
      roomNumber,
      description,
      image,
      images,
      status,
      rating,
      popular,
    } = req.body || {};

    const roomName = String(name || "").trim();
    if (!roomName) {
      return res.status(400).json({ success: false, message: "نام اتاق الزامی است" });
    }
    const price = Number(pricePerNight);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ success: false, message: "قیمت نامعتبر است" });
    }
    const cap = Number(capacity);
    if (isNaN(cap) || cap < 1) {
      return res.status(400).json({ success: false, message: "ظرفیت نامعتبر است" });
    }
    const st = String(status || "inactive").toLowerCase();
    if (!["active", "inactive"].includes(st)) {
      return res.status(400).json({ success: false, message: "وضعیت نامعتبر است" });
    }

    const slugBase = roomName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "");
    const dup = await query(`SELECT COUNT(*) AS c FROM rooms WHERE slug = ?`, [slugBase]);
    const slug = dup[0].c > 0 ? `${slugBase}-${Date.now()}` : slugBase;

    const result = await query(
      `INSERT INTO rooms
        (name, slug, price_per_night, capacity, extra_capacity, type, area, room_number, description, image, images, status, rating, popular)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        roomName.slice(0, 100),
        slug,
        price,
        cap,
        isNaN(Number(extraCapacity)) ? 0 : Math.max(0, Number(extraCapacity)),
        String(type || "").slice(0, 50),
        String(area || "").slice(0, 100),
        String(roomNumber || "").slice(0, 20),
        String(description || "").slice(0, 2000),
        String(image || "").slice(0, 500),
        JSON.stringify(Array.isArray(images) ? images : []),
        st,
        isNaN(Number(rating)) ? 0 : Math.min(5, Math.max(0, Number(rating))),
        popular ? 1 : 0,
      ]
    );

    const created = await query(`SELECT * FROM rooms WHERE id = ? LIMIT 1`, [result.insertId]);

    createNotification({
      type: "ROOM_CREATED",
      title: "اتاق جدید اضافه شد",
      message: `اتاق «${created[0].name}» با قیمت ${Number(created[0].price_per_night).toLocaleString("fa-IR")} تومان اضافه شد`,
      refType: "room",
      refId: result.insertId,
    });

    res.status(201).json({ success: true, message: "اتاق ایجاد شد", room: mapRoom(created[0]) });
  } catch (err) {
    console.error("createRoom error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { getSettings, updateSettings, listRooms, updateRoom, createRoom };
