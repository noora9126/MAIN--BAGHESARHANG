const { query } = require("../config/db");
const { sendSms, sendCheckInSms, sendCheckOutSms } = require("../services/smsService");
const { isRoomAvailable, getRoomById, expireStalePending } = require("../services/reservationService");
const { createNotification } = require("../services/notificationService");
const { decrementDiscountUsage } = require("../services/discountService");
const { dateOnlyString } = require("../utils/helpers");

const VALID_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "CANCELLATION_REQUESTED", "REFUND_PENDING"];

// ─────────────── داده تقویم اشغال ───────────────
// برای نمایش ماتریس «اتاق × روز» و خلاصه روزانه (کدام روزها خالی/پر هستند)
const getCalenderData = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const defaultTo = new Date(today);
    defaultTo.setMonth(defaultTo.getMonth() + 1);

    const from = req.query.from || dateOnlyString(today);
    const to = req.query.to || dateOnlyString(defaultTo);

    const roomRows = await query(
      `SELECT id, name, image, price_per_night, capacity, extra_capacity FROM rooms WHERE status = 'active' ORDER BY id`
    );
    const bookingRows = await query(
      `SELECT id, reservation_number, room_id, check_in, check_out, status, guest_name, number_of_adults, number_of_children, payment_status
       FROM reservations
       WHERE status IN ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CANCELLATION_REQUESTED', 'REFUND_PENDING')
         AND check_out > ? AND check_in < ?
       ORDER BY check_in`,
      [from, to]
    );

    res.json({
      success: true,
      rooms: roomRows,
      bookings: bookingRows,
    });
  } catch (err) {
    console.error("getCalenderData error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── لیست رزروها (فیلتر، جستجو، مرتب‌سازی، صفحه‌بندی) ───────────────
const listReservations = async (req, res) => {
  try {
    const { status, search, roomId, from, to, sort = "-createdAt", page = 1, limit = 20 } = req.query;
    const conditions = [];
    const params = [];

    if (status && VALID_STATUSES.includes(String(status).toUpperCase())) {
      conditions.push("r.status = ?");
      params.push(String(status).toUpperCase());
    }
    if (roomId && !isNaN(Number(roomId))) {
      conditions.push("r.room_id = ?");
      params.push(Number(roomId));
    }
    if (from) {
      conditions.push("r.check_in >= ?");
      params.push(from);
    }
    if (to) {
      conditions.push("r.check_in <= ?");
      params.push(to);
    }
    if (search) {
      conditions.push(
        "(r.reservation_number LIKE ? OR r.guest_name LIKE ? OR r.guest_email LIKE ? OR r.guest_phone LIKE ?)"
      );
      const like = `%${String(search).trim()}%`;
      params.push(like, like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const sortCol = {
      createdAt: "r.created_at",
      checkIn: "r.check_in",
      totalPrice: "r.total_price",
      status: "r.status",
    }[String(sort).replace(/^-/, "")] || "r.created_at";
    const sortDir = String(sort).startsWith("-") ? "DESC" : "ASC";

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countRows = await query(`SELECT COUNT(*) AS total FROM reservations r ${where}`, params);
    const rows = await query(
      `SELECT r.*, rm.image AS room_image
       FROM reservations r
       LEFT JOIN rooms rm ON rm.id = r.room_id
       ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({
      success: true,
      reservations: rows,
      total: countRows[0].total,
      page: pageNum,
      pages: Math.ceil(countRows[0].total / limitNum),
    });
  } catch (err) {
    console.error("listReservations error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── جزئیات رزرو ───────────────
const getReservation = async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, rm.image AS room_image
       FROM reservations r
       LEFT JOIN rooms rm ON rm.id = r.room_id
       WHERE r.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }
    res.json({ success: true, reservation: rows[0] });
  } catch (err) {
    console.error("getReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ویرایش رزرو (یادداشت‌ها و وضعیت) ───────────────
const updateReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    const updates = [];
    const params = [];

    if (req.body.status !== undefined) {
      const newStatus = String(req.body.status).toUpperCase();
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({ success: false, message: "وضعیت نامعتبر است" });
      }
      updates.push("status = ?");
      params.push(newStatus);
    }
    if (req.body.adminNotes !== undefined) {
      updates.push("admin_notes = ?");
      params.push(String(req.body.adminNotes || "").slice(0, 2000));
    }
    if (req.body.numberOfGuests !== undefined) {
      updates.push("number_of_guests = ?");
      params.push(Number(req.body.numberOfGuests));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "موردی برای ویرایش وجود ندارد" });
    }

    params.push(id);
    await query(`UPDATE reservations SET ${updates.join(", ")}, updated_at = NOW() WHERE id = ?`, params);

    const updated = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    res.json({ success: true, message: "رزرو ویرایش شد", reservation: updated[0] });
  } catch (err) {
    console.error("updateReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ثبت ورود ───────────────
const checkIn = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    await query(
      `UPDATE reservations SET status = 'CHECKED_IN', checked_in_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (reservation.guest_phone && req.body.sendSms !== false) {
      const sms = await sendCheckInSms({
        phone: reservation.guest_phone,
        reservationNumber: reservation.reservation_number,
        roomName: reservation.room_name,
        reservationId: id,
      });
      await query(`UPDATE reservations SET sms_status = ? WHERE id = ?`, [sms.success ? "SENT" : "FAILED", id]);
    }

    createNotification({
      type: "CHECK_IN",
      title: "ورود مهمان ثبت شد",
      message: `${reservation.guest_name} وارد ${reservation.room_name} شد (رزرو ${reservation.reservation_number})`,
      refType: "reservation",
      refId: id,
    });

    res.json({ success: true, message: "ورود مهمان ثبت شد", checkedInAt: new Date() });
  } catch (err) {
    console.error("checkIn error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ثبت خروج ───────────────
const checkOut = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    await query(
      `UPDATE reservations SET status = 'CHECKED_OUT', checked_out_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (reservation.guest_phone && req.body.sendSms !== false) {
      const sms = await sendCheckOutSms({
        phone: reservation.guest_phone,
        reservationNumber: reservation.reservation_number,
        reservationId: id,
      });
      await query(`UPDATE reservations SET sms_status = ? WHERE id = ?`, [sms.success ? "SENT" : "FAILED", id]);
    }

    createNotification({
      type: "CHECK_OUT",
      title: "خروج مهمان ثبت شد",
      message: `${reservation.guest_name} از ${reservation.room_name} خارج شد (رزرو ${reservation.reservation_number})`,
      refType: "reservation",
      refId: id,
    });

    res.json({ success: true, message: "خروج مهمان ثبت شد", checkedOutAt: new Date() });
  } catch (err) {
    console.error("checkOut error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── کنسل کردن (فقط رزروهای پرداخت‌نشده) ───────────────
const cancelReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }
    const reservation = rows[0];

    if (reservation.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "این رزرو قبلاً لغو شده است" });
    }

    if (reservation.payment_status === "SUCCESS") {
      return res.status(400).json({ success: false, message: "رزروهای پرداخت شده باید از طریق فرآیند بازپرداخت لغو شوند" });
    }

    if (reservation.status === "CHECKED_IN" || reservation.status === "CHECKED_OUT") {
      return res.status(400).json({ success: false, message: "امکان لغو رزرو در این مرحله وجود ندارد" });
    }

    await query(`UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`, [id]);

    // آزادسازی سهمیه استفاده از کد تخفیف
    if (reservation.discount_code) {
      await decrementDiscountUsage(reservation.discount_code);
    }

    createNotification({
      type: "CANCELLED",
      title: "رزرو کنسل شد",
      message: `رزرو ${reservation.reservation_number} — ${reservation.room_name} (${reservation.guest_name}) کنسل شد`,
      refType: "reservation",
      refId: id,
    });

    res.json({ success: true, message: "رزرو کنسل شد" });
  } catch (err) {
    console.error("cancelReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ارسال پیامک شخصی برای رزرو ───────────────
const sendReservationSms = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }
    if (!reservation.guest_phone) {
      return res.status(400).json({ success: false, message: "شماره تلفن مهمان ثبت نشده است" });
    }

    const message = String(req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({ success: false, message: "متن پیامک الزامی است" });
    }

    const result = await sendSms(reservation.guest_phone, message, { type: "ADMIN_CUSTOM", reservationId: id });
    if (!result.success) {
      return res.status(502).json({ success: false, message: "ارسال پیامک ناموفق بود" });
    }

    res.json({ success: true, message: "پیامک ارسال شد", simulated: Boolean(result.simulated) });
  } catch (err) {
    console.error("sendReservationSms error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = {
  listReservations,
  getReservation,
  updateReservation,
  checkIn,
  checkOut,
  cancelReservation,
  sendReservationSms,
  getCalenderData,
};
