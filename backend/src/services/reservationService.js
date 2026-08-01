const { query } = require("../config/db");
const { buildReservationNumber, nightsBetween, parseDateOnly } = require("../utils/helpers");

// بررسی اینکه اتاق در بازه تاریخ، رزرو تداخلی ندارد
async function isRoomAvailable(roomId, checkIn, checkOut, excludeReservationId = null) {
  const params = [roomId, checkOut, checkIn];
  let sql = `
    SELECT id FROM reservations
    WHERE room_id = ?
      AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN')
      AND check_in < ? AND check_out > ?
  `;
  if (excludeReservationId) {
    sql += " AND id <> ?";
    params.push(excludeReservationId);
  }
  sql += " LIMIT 1";

  const rows = await query(sql, params);
  return rows.length === 0;
}

// محاسبه تعداد شب‌ها و قیمت کل
function calculatePricing(room, checkIn, checkOut) {
  const ci = parseDateOnly(checkIn);
  const co = parseDateOnly(checkOut);
  const nights = nightsBetween(ci, co);
  const pricePerNight = Number(room.price_per_night ?? room.pricePerNight ?? 0);
  return { nights, pricePerNight, totalPrice: nights * pricePerNight };
}

// شماره رزرو ترتیبی روزانه: RES-YYYYMMDD-001
async function nextReservationNumber() {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM reservations WHERE DATE(created_at) = CURDATE()`
  );
  return buildReservationNumber(new Date(), Number(rows[0]?.cnt || 0) + 1);
}

async function getRoomById(roomId) {
  const rows = await query("SELECT * FROM rooms WHERE id = ? AND status = 'active'", [roomId]);
  return rows[0] || null;
}

function mapRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomNumber: row.room_number || null,
    name: row.name,
    slug: row.slug,
    type: row.type,
    capacity: row.capacity,
    extraCapacity: row.extra_capacity,
    pricePerNight: Number(row.price_per_night),
    area: row.area,
    rating: row.rating,
    popular: Boolean(row.popular),
    description: row.description,
    amenities: safeParse(row.amenities),
    images: safeParse(row.images),
    image: row.image,
    status: row.status,
  };
}

function safeParse(str) {
  if (!str) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

module.exports = {
  isRoomAvailable,
  calculatePricing,
  nextReservationNumber,
  getRoomById,
  mapRoom,
};
