const crypto = require("crypto");
const { query } = require("../config/db");
const {
  isRoomAvailable,
  calculatePricing,
  nextReservationNumber,
  getRoomById,
} = require("../services/reservationService");
const { sendOtp, sendReservationConfirmed, smsEnabled } = require("../services/smsService");
const { generateOtpCode, dateOnlyString } = require("../utils/helpers");

// ─────────────── ایجاد رزرو (مرحله 1) ───────────────
const createReservation = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, numberOfGuests, guestName, guestEmail, specialRequests } = req.booking;

    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "اتاق یافت نشد" });
    }

    if (numberOfGuests > Number(room.capacity) + Number(room.extra_capacity || 0)) {
      return res.status(400).json({
        success: false,
        message: `ظرفیت این اتاق حداکثر ${room.capacity} نفر است`,
      });
    }

    const available = await isRoomAvailable(roomId, dateOnlyString(checkIn), dateOnlyString(checkOut));
    if (!available) {
      return res.status(409).json({
        success: false,
        message: "اتاق موردنظر در این تاریخ‌ها رزرو شده است. تاریخ دیگری انتخاب کنید.",
      });
    }

    const { nights, pricePerNight, totalPrice } = calculatePricing(room, dateOnlyString(checkIn), dateOnlyString(checkOut));

    const reservationNumber = await nextReservationNumber();

    const result = await query(
      `INSERT INTO reservations
        (reservation_number, room_id, room_number, room_name, check_in, check_out,
         number_of_nights, number_of_guests, guest_name, guest_email, guest_phone,
         special_requests, price_per_night, total_price, status, payment_status, sms_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', 'PENDING')`,
      [
        reservationNumber,
        room.id,
        room.roomNumber || null,
        room.name,
        dateOnlyString(checkIn),
        dateOnlyString(checkOut),
        nights,
        numberOfGuests,
        guestName,
        guestEmail,
        "", // phone در مرحله تایید شماره تکمیل می‌شود
        specialRequests,
        pricePerNight,
        totalPrice,
      ]
    );

    res.status(201).json({
      success: true,
      message: "رزرو ایجاد شد",
      reservation: {
        id: result.insertId,
        reservation_number: reservationNumber,
        room_id: room.id,
        room_name: room.name,
        room_number: room.roomNumber || null,
        check_in: dateOnlyString(checkIn),
        check_out: dateOnlyString(checkOut),
        number_of_nights: nights,
        number_of_guests: numberOfGuests,
        guest_name: guestName,
        guest_email: guestEmail,
        price_per_night: pricePerNight,
        total_price: totalPrice,
        status: "PENDING",
        payment_status: "PENDING",
      },
    });
  } catch (err) {
    console.error("createReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── درخواست کد تایید (مرحله 2) ───────────────
const verifyPhone = async (req, res) => {
  try {
    const phone = req.body.phone;
    const code = generateOtpCode();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // باطل کردن جلسات قبلی این شماره
    await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE phone = ? AND status = 'PENDING'`, [phone]);

    await query(
      `INSERT INTO phone_verifications (session_id, phone, code, attempts, status, expires_at)
       VALUES (?, ?, ?, 0, 'PENDING', ?)`,
      [sessionId, phone, code, expiresAt]
    );

    const result = await sendOtp(phone, code);
    const devMode = result.simulated || !result.success;

    res.json({
      success: true,
      message: result.simulated
        ? "کد تایید ارسال شد (حالت تستی)"
        : result.success
        ? "کد تایید ارسال شد"
        : "ارسال پیامک ناموفق بود؛ کد فقط برای تست برگردانده شد",
      sessionId,
      attempts: 0,
      maxAttempts: 3,
      // فقط در حالت شبیه‌سازی یا عدم موفقیت ارسال (بدون SMS فعال) کد برگردانده می‌شود
      ...(devMode ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("verifyPhone error:", err);
    res.status(500).json({ success: false, message: "خطا در ارسال پیامک" });
  }
};

// ─────────────── تایید کد (مرحله 3) ───────────────
const verifyCode = async (req, res) => {
  try {
    const { sessionId, code } = req.body;

    const rows = await query(`SELECT * FROM phone_verifications WHERE session_id = ? LIMIT 1`, [sessionId]);
    const session = rows[0];

    if (!session || session.status === "EXPIRED") {
      return res.status(400).json({ success: false, message: "جلسه نامعتبر است" });
    }

    if (new Date(session.expires_at) < new Date()) {
      await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
      return res.status(400).json({ success: false, message: "کد منقضی شده است. دوباره درخواست دهید." });
    }

    if (session.status === "VERIFIED") {
      return res.json({ success: true, verified: true, phone: session.phone });
    }

    if (session.attempts >= 3) {
      await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
      return res.status(429).json({ success: false, message: "تعداد تلاش‌ها بیش از حد مجاز است. دوباره درخواست دهید." });
    }

    if (String(session.code) !== String(code)) {
      const attempts = session.attempts + 1;
      await query(`UPDATE phone_verifications SET attempts = ? WHERE id = ?`, [attempts, session.id]);
      return res.status(400).json({
        success: false,
        message: `کد اشتباه است. ${3 - attempts} تلاش باقی مانده.`,
        attemptsLeft: 3 - attempts,
      });
    }

    await query(`UPDATE phone_verifications SET status = 'VERIFIED' WHERE id = ?`, [session.id]);

    res.json({ success: true, verified: true, phone: session.phone, message: "شماره تایید شد" });
  } catch (err) {
    console.error("verifyCode error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ثبت شماره تاییدشده روی رزرو ───────────────
const attachVerifiedPhone = async (req, res) => {
  try {
    const { reservationId, phone } = req.body;
    const id = Number(reservationId);
    if (!id || !phone) {
      return res.status(400).json({ success: false, message: "مشخصات ناقص است" });
    }

    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    // بررسی اینکه شماره تایید شده باشد
    const verified = await query(
      `SELECT id FROM phone_verifications WHERE phone = ? AND status = 'VERIFIED' ORDER BY id DESC LIMIT 1`,
      [phone]
    );
    if (verified.length === 0) {
      return res.status(400).json({ success: false, message: "شماره تایید نشده است" });
    }

    await query(`UPDATE reservations SET guest_phone = ? WHERE id = ?`, [phone, id]);

    res.json({ success: true, message: "شماره روی رزرو ثبت شد" });
  } catch (err) {
    console.error("attachVerifiedPhone error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── جزئیات رزرو ───────────────
const getReservation = async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, (SELECT COUNT(*) FROM reservations WHERE guest_phone = r.guest_phone AND guest_phone <> '') AS guest_bookings
       FROM reservations r WHERE r.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }
    res.json({ success: true, reservation: rows[0] });
  } catch (err) {
    console.error("getReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { createReservation, verifyPhone, verifyCode, attachVerifiedPhone, getReservation };
