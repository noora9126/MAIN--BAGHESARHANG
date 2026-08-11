const crypto = require("crypto");
const { query } = require("../config/db");
const {
  isRoomAvailable,
  calculatePricing,
  nextReservationNumber,
  getRoomById,
} = require("../services/reservationService");
const { sendOtp, sendReservationConfirmed, smsEnabled } = require("../services/smsService");
const { createNotification } = require("../services/notificationService");
const { applyDiscountByCode, incrementDiscountUsage } = require("../services/discountService");
const { generateOtpCode, hashOtpCode, dateOnlyString, OTP_TTL_MINUTES } = require("../utils/helpers");

// ─────────────── ایجاد رزرو (مرحله 1) ───────────────
const createReservation = async (req, res) => {
  try {
    const {
      roomId,
      checkIn,
      checkOut,
      numberOfGuests,
      numberOfAdults,
      numberOfChildren,
      childAges,
      guests,
      guestName,
      guestEmail,
      nationalId,
      specialRequests,
      discountCode,
    } = req.booking;

    const room = await getRoomById(roomId);
    if (!room) {
      return res.status(404).json({ success: false, message: "اتاق یافت نشد" });
    }

    const maxPersons = Number(room.capacity) + Number(room.extra_capacity || 0);
    if (numberOfGuests > maxPersons) {
      return res.status(400).json({
        success: false,
        message: `ظرفیت این اتاق حداکثر ${maxPersons} نفر است`,
      });
    }

    // یکسان بودن کد ملی با نام ثبت‌شده قبلی این فرد
    for (const g of guests) {
      const prev = await query(
        `SELECT guest_name FROM reservations
         WHERE guest_national_id = ? AND guest_name <> ? AND status <> 'CANCELLED'
         ORDER BY id DESC LIMIT 1`,
        [g.nationalId, g.name]
      );
      if (prev[0]) {
        return res.status(409).json({
          success: false,
          message: `کد ملی «${g.nationalId}» قبلاً با نام «${prev[0].guest_name}» ثبت شده است. در صورت اشتباه، نام را اصلاح کنید.`,
        });
      }
    }

    const available = await isRoomAvailable(roomId, dateOnlyString(checkIn), dateOnlyString(checkOut));
    if (!available) {
      return res.status(409).json({
        success: false,
        message: "اتاق موردنظر در این تاریخ‌ها رزرو شده است. تاریخ دیگری انتخاب کنید.",
      });
    }

    const pricing = await calculatePricing(room, dateOnlyString(checkIn), dateOnlyString(checkOut), numberOfAdults, numberOfChildren, childAges);

    // اعمال کد تخفیف روی مبلغ نهایی (درصد از کل مبلغ)
    let discount = null;
    if (discountCode) {
      discount = await applyDiscountByCode({
        code: discountCode,
        phone: "", // شماره در مرحله تایید تکمیل می‌شود
        totalPrice: pricing.totalPrice,
      });
      pricing.totalPrice = Math.max(0, pricing.totalPrice - discount.amount);
    }

    const reservationNumber = await nextReservationNumber();

    const result = await query(
      `INSERT INTO reservations
        (reservation_number, room_id, room_number, room_name, check_in, check_out,
         number_of_nights, number_of_guests, number_of_adults, number_of_children,
         child_ages, guest_details,
         guest_name, guest_email, guest_phone,
         guest_national_id, special_requests, price_per_night, total_price,
         discount_code, discount_percent, discount_amount, discount_reason,
         status, payment_status, sms_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', 'PENDING')`,
      [
        reservationNumber,
        room.id,
        room.roomNumber || null,
        room.name,
        dateOnlyString(checkIn),
        dateOnlyString(checkOut),
        pricing.nights,
        numberOfGuests,
        numberOfAdults,
        numberOfChildren,
        JSON.stringify(childAges),
        JSON.stringify(guests),
        guestName,
        guestEmail,
        "", // phone در مرحله تایید شماره تکمیل می‌شود
        nationalId,
        specialRequests,
        pricing.adultPrice,
        pricing.totalPrice,
        discount ? discount.code : null,
        discount ? discount.percent : null,
        discount ? discount.amount : null,
        discount ? discount.reason : null,
      ]
    );

    if (discount) {
      await incrementDiscountUsage(discount.code);
    }

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
        number_of_nights: pricing.nights,
        number_of_guests: numberOfGuests,
        number_of_adults: numberOfAdults,
        number_of_children: numberOfChildren,
        child_ages: childAges,
        guest_details: guests,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_national_id: nationalId,
        price_per_night: pricing.adultPrice,
        total_price: pricing.totalPrice,
        discount_code: discount ? discount.code : null,
        discount_percent: discount ? discount.percent : null,
        discount_amount: discount ? discount.amount : null,
        status: "PENDING",
        payment_status: "PENDING",
      },
      pricing: {
        adultPrice: pricing.adultPrice,
        childRates: pricing.childRates,
        adultTotal: pricing.adultTotal,
        childTotal: pricing.childTotal,
        totalPrice: pricing.totalPrice,
        discount: discount
          ? { code: discount.code, percent: discount.percent, amount: discount.amount }
          : null,
      },
    });

    createNotification({
      type: "NEW_RESERVATION",
      title: "رزرو جدید ثبت شد",
      message: `رزرو ${reservationNumber} — ${room.name} از ${dateOnlyString(checkIn)} تا ${dateOnlyString(checkOut)} توسط ${guestName}`,
      refType: "reservation",
      refId: result.insertId,
    });
  } catch (err) {
    console.error("createReservation error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── درخواست کد تایید (مرحله 2) ───────────────
// استاندارد OWASP/NIST برای کد یکبارمصرف پیامکی:
//  - مدت اعتبار کوتاه (اینجا ۲ دقیقه — نه ۱۰ دقیقه)
//  - فقط یکبار مصرف (بعد از تایید، جلسه بسته می‌شود)
//  - ذخیره‌سازی هش‌شده، نه متن ساده
//  - محدودیت تعداد تلاش (۳ بار) و محدودیت ارسال مجدد (rate limiter)
const verifyPhone = async (req, res) => {
  try {
    const phone = req.body.phone;
    const code = generateOtpCode();
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // باطل کردن جلسات قبلی این شماره (در صورت درخواست مجدد، کد جدید جایگزین کد قبلی می‌شود)
    await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE phone = ? AND status = 'PENDING'`, [phone]);

    await query(
      `INSERT INTO phone_verifications (session_id, phone, code, attempts, status, expires_at)
       VALUES (?, ?, ?, 0, 'PENDING', ?)`,
      [sessionId, phone, hashOtpCode(code), expiresAt]
    );

    const result = await sendOtp(phone, code);
    const isProduction = process.env.NODE_ENV === "production";

    // در پروداکشن کد هرگز در پاسخ برنگردد
    if (!result.success) {
      if (isProduction) {
        return res.status(502).json({
          success: false,
          message: "ارسال پیامک ناموفق بود؛ کمی بعد دوباره تلاش کنید",
        });
      }
      return res.json({
        success: true,
        message: "ارسال پیامک ناموفق بود؛ کد فقط برای تست برگردانده شد",
        sessionId,
        attempts: 0,
        maxAttempts: 3,
        expiresInSeconds: OTP_TTL_MINUTES * 60,
        ...{ devCode: code },
      });
    }

    res.json({
      success: true,
      message: result.simulated ? "کد تایید ارسال شد (حالت تستی)" : "کد تایید ارسال شد",
      sessionId,
      attempts: 0,
      maxAttempts: 3,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      // فقط در حالت شبیه‌سازی (و خارج از پروداکشن) کد برگردانده می‌شود
      ...(result.simulated && !isProduction ? { devCode: code } : {}),
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
    const hashed = hashOtpCode(code);

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
      // کد فقط یکبار مصرف است؛ تکرار ارسال بعد از تایید پذیرفته نمی‌شود
      return res.status(400).json({ success: false, message: "این کد قبلاً استفاده شده است. در صورت نیاز دوباره درخواست دهید." });
    }

    if (session.attempts >= 3) {
      await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
      return res.status(429).json({ success: false, message: "تعداد تلاش‌ها بیش از حد مجاز است. دوباره درخواست دهید." });
    }

    if (String(session.code) !== String(hashed)) {
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
