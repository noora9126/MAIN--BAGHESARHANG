const { query } = require("../config/db");
const { buildReservationNumber, nightsBetween, parseDateOnly, dateOnlyString, childNightPrice } = require("../utils/helpers");

// رزروهای «در انتظار پرداخت» که خیلی قدیمی‌اند (احتمالاً رهاشده) به صورت خودکار کنسل می‌شوند
const STALE_PENDING_HOURS = 4;

async function expireStalePending() {
  try {
    await query(
      `UPDATE reservations
       SET status = 'CANCELLED', updated_at = NOW()
       WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL ? HOUR`,
      [STALE_PENDING_HOURS]
    );
  } catch (err) {
    console.error("expireStalePending error:", err);
  }
}

// بررسی اینکه اتاق در بازه تاریخ، رزرو تداخلی ندارد
async function isRoomAvailable(roomId, checkIn, checkOut, excludeReservationId = null) {
  await expireStalePending();
  const params = [roomId, checkOut, checkIn];
  let sql = `
    SELECT id FROM reservations
    WHERE room_id = ?
      AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLATION_REQUESTED', 'REFUND_PENDING')
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

// تاریخ‌های اشغال‌شده برای یک اتاق در بازه دلخواه
// خروجی: [{ date: 'YYYY-MM-DD', status: 'CONFIRMED' | 'PENDING' }]
//  - CONFIRMED: رزرو قطعی/پرداخت‌شده یا ورود انجام‌شده (قرمز)
//  - PENDING: رزرو ایجادشده ولی هنوز پرداخت نشده (نارنجی)
async function getRoomAvailability(roomId, from, to) {
  await expireStalePending();
  const rows = await query(
    `SELECT check_in, check_out, status FROM reservations
     WHERE room_id = ? AND status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLATION_REQUESTED', 'REFUND_PENDING')
       AND check_out > ? AND check_in < ?`,
    [roomId, from, to]
  );

  const byDate = {};
  for (const row of rows) {
    const ci = parseDateOnly(row.check_in);
    const co = parseDateOnly(row.check_out);
    const current = new Date(ci);
    while (current < co) {
      const iso = dateOnlyString(current);
      const st = row.status === "PENDING" ? "PENDING" : "CONFIRMED";
      if (!byDate[iso] || st === "CONFIRMED") byDate[iso] = st;
      current.setDate(current.getDate() + 1);
    }
  }
  return Object.entries(byDate).map(([date, status]) => ({ date, status }));
}

// ─────────────── سیاست قیمت‌گذاری کودک (از تنظیمات پنل مدیریت) ───────────────
const DEFAULT_CHILD_POLICY = { freeUnder: 2, halfUnder: 12 };

async function getChildPolicy() {
  try {
    const rows = await query(
      `SELECT setting_key, setting_value FROM settings
       WHERE setting_key IN ('child_free_until_age', 'child_half_price_until_age')`
    );
    const policy = { ...DEFAULT_CHILD_POLICY };
    for (const row of rows) {
      if (row.setting_key === "child_free_until_age") policy.freeUnder = Number(row.setting_value) || DEFAULT_CHILD_POLICY.freeUnder;
      if (row.setting_key === "child_half_price_until_age") policy.halfUnder = Number(row.setting_value) || DEFAULT_CHILD_POLICY.halfUnder;
    }
    return policy;
  } catch (err) {
    console.error("getChildPolicy error:", err);
    return { ...DEFAULT_CHILD_POLICY };
  }
}

// محاسبه تعداد شب‌ها و قیمت کل بر اساس سرانه:
//  - هر بزرگسال: قیمت اتاق برای هر شب
//  - کودک زیر ۲ سال: رایگان / ۲ تا ۱۲ سال: نیم‌بها / بالای ۱۲ سال: بزرگسال
async function calculatePricing(room, checkIn, checkOut, adults = 1, children = 0, childAges = [], policy) {
  const ci = parseDateOnly(checkIn);
  const co = parseDateOnly(checkOut);
  const nights = nightsBetween(ci, co);
  const adultPrice = Number(room.price_per_night ?? room.pricePerNight ?? 0);
  const childPol = policy || (await getChildPolicy());
  const adultTotal = nights * Number(adults || 1) * adultPrice;

  const childRates = (Array.isArray(childAges) ? childAges : []).map((age) =>
    childNightPrice(age, adultPrice, childPol)
  );
  const childTotal = nights * childRates.reduce((sum, v) => sum + v, 0);

  return {
    nights,
    pricePerNight: adultPrice, // قیمت هر شب برای هر بزرگسال
    adultPrice,
    childRates,
    childPolicy: childPol,
    adultTotal,
    childTotal,
    totalPrice: adultTotal + childTotal,
  };
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
    capacity: Number(row.capacity || 0),
    extraCapacity: Number(row.extra_capacity || 0),
    pricePerNight: Number(row.price_per_night || 0),
    area: row.area,
    rating: Number(row.rating || 0),
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
  getRoomAvailability,
  expireStalePending,
  calculatePricing,
  nextReservationNumber,
  getRoomById,
  mapRoom,
  STALE_PENDING_HOURS,
};
