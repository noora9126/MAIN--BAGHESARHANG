const { query } = require("../config/db");
const { mapRoom, getRoomAvailability } = require("../services/reservationService");
const { dateOnlyString } = require("../utils/helpers");

const getRooms = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, slug, type, price_per_night, capacity, area, rating,
              extra_capacity, popular, description, image, images, status, room_number
       FROM rooms WHERE status = 'active'`
    );
    const rooms = rows.map(mapRoom);
    res.json({ success: true, rooms });
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

const getRoomById = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, slug, type, price_per_night, capacity, area, rating,
              extra_capacity, popular, description, image, images, status, room_number
       FROM rooms WHERE id = ? AND status = 'active'`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "اتاق یافت نشد" });
    }
    res.json({ success: true, room: mapRoom(rows[0]) });
  } catch (err) {
    console.error("getRoomById error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

const getRoomBySlug = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, slug, type, price_per_night, capacity, area, rating,
              extra_capacity, popular, description, image, images, status, room_number
       FROM rooms WHERE slug = ? AND status = 'active'`,
      [req.params.slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "اتاق یافت نشد" });
    }
    res.json({ success: true, room: mapRoom(rows[0]) });
  } catch (err) {
    console.error("getRoomBySlug error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── تاریخ‌های اشغال‌شده یک اتاق ───────────────
// برای نمایش قرمز/نارنجی روزهای رزروشده در تقویم سایت
const getRoomAvailabilityController = async (req, res) => {
  try {
    const roomId = Number(req.params.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const far = new Date(today);
    far.setFullYear(far.getFullYear() + 1);

    const from = req.query.from || dateOnlyString(today);
    const to = req.query.to || dateOnlyString(far);

    const dates = await getRoomAvailability(roomId, from, to);
    res.json({ success: true, dates });
  } catch (err) {
    console.error("getRoomAvailability error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { getRooms, getRoomById, getRoomBySlug, getRoomAvailabilityController };
