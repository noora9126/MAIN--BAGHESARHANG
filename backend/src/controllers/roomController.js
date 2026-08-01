const { query } = require("../config/db");
const { mapRoom } = require("../services/reservationService");

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

module.exports = { getRooms, getRoomById };
