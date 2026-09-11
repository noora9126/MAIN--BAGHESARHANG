const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { requestOtp, verifyOtp } = require("../services/otpService");
const { logAudit, clientIp } = require("../services/auditLogService");
const { sendSms } = require("../services/smsService");
const { createNotification } = require("../services/notificationService");
const { isValidPhone } = require("../utils/helpers");

const RESET_TOKEN_TTL = "10m";

function customerToken(customer) {
  return jwt.sign(
    { type: "customer", id: customer.id, mobile: customer.mobile, name: customer.full_name, username: customer.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRE || "7d" }
  );
}

function publicCustomer(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    mobile: row.mobile,
    email: row.email,
    national_code: row.national_code,
    username: row.username || null,
    created_at: row.created_at,
  };
}

// ─────────────── ثبت‌نام ───────────────
const register = async (req, res) => {
  try {
    const { fullName, mobile, password, username } = req.customerBody;

    const existing = await query(`SELECT id, full_name, is_active FROM customers WHERE mobile = ? LIMIT 1`, [mobile]);
    if (existing[0] && existing[0].is_active) {
      return res.status(409).json({ success: false, message: "این شماره موبایل قبلاً ثبت‌نام کرده است؛ وارد شوید" });
    }

    // بررسی یکتایی نام کاربری
    if (username) {
      const existingUsername = await query(`SELECT id FROM customers WHERE username = ? LIMIT 1`, [username]);
      if (existingUsername[0]) {
        return res.status(409).json({ success: false, message: "این نام کاربری قبلاً استفاده شده است" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    let customerId;
    if (existing[0] && !existing[0].is_active) {
      await query(`UPDATE customers SET full_name = ?, password_hash = ?, username = ? WHERE id = ?`, [fullName, hash, username || null, existing[0].id]);
      customerId = existing[0].id;
    } else {
      const result = await query(
        `INSERT INTO customers (full_name, mobile, password_hash, is_active, username) VALUES (?, ?, ?, 0, ?)`,
        [fullName, mobile, hash, username || null]
      );
      customerId = result.insertId;
    }

    const customer = {
      id: customerId,
      full_name: fullName,
      mobile,
      email: null,
      national_code: null,
      username: username || null,
      created_at: new Date(),
    };

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: mobile,
      action: "CUSTOMER_REGISTER",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
      metadata: { fullName, username },
    });

    try {
      const { sessionId, code, result } = await requestOtp(mobile, "REGISTER");
      const isProduction = process.env.NODE_ENV === "production";

      if (!result.success && isProduction) {
        return res.status(502).json({ success: false, message: "ارسال پیامک ناموفق بود؛ کمی بعد دوباره تلاش کنید" });
      }

      return res.status(201).json({
        success: true,
        message: result.success ? "ثبت‌نام انجام شد؛ کد تایید ارسال شد" : "ثبت‌نام انجام شد؛ کد تایید برای تست برگردانده شد",
        sessionId,
        expiresInSeconds: 120,
        ...((result.simulated || !result.success) && !isProduction ? { devCode: code } : {}),
        customer: publicCustomer(customer),
      });
    } catch (err) {
      console.error("requestOtp failed during register:", err);
      return res.status(201).json({
        success: true,
        message: "ثبت‌نام انجام شد؛ اما ارسال کد تأیید با مشکل مواجه شد",
        customer: publicCustomer(customer),
      });
    }
  } catch (err) {
    console.error("customer register error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── تأیید کد ثبت‌نام و فعال‌سازی حساب ───────────────
const verifyRegister = async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const result = await verifyOtp(sessionId, code, "REGISTER");

    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const rows = await query(`SELECT * FROM customers WHERE mobile = ? LIMIT 1`, [result.phone]);
    const customer = rows[0];
    if (!customer) {
      return res.status(400).json({ success: false, message: "حسابی با این شماره یافت نشد" });
    }

    await query(`UPDATE customers SET is_active = 1 WHERE id = ?`, [customer.id]);

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: customer.mobile,
      action: "CUSTOMER_PHONE_VERIFIED",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
    });

    res.json({
      success: true,
      message: "شماره موبایل با موفقیت تأیید شد",
      token: customerToken(customer),
      customer: publicCustomer(customer),
    });
  } catch (err) {
    console.error("verifyRegister error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── ارسال مجدد کد ثبت‌نام ───────────────
const resendRegisterCode = async (req, res) => {
  try {
    const mobile = String(req.body.phone || "").trim();
    const rows = await query(
      `SELECT id FROM customers WHERE mobile = ? AND password_hash IS NOT NULL LIMIT 1`,
      [mobile]
    );
    if (!rows[0]) {
      return res.status(400).json({ success: false, message: "حسابی با این شماره یافت نشد" });
    }

    const { sessionId, code, result } = await requestOtp(mobile, "REGISTER");
    const isProduction = process.env.NODE_ENV === "production";

    if (!result.success && isProduction) {
      return res.status(502).json({ success: false, message: "ارسال پیامک ناموفق بود؛ کمی بعد دوباره تلاش کنید" });
    }

    res.json({
      success: true,
      message: result.success ? "کد تأیید مجدداً ارسال شد" : "ارسال پیامک ناموفق بود؛ کد فقط برای تست برگردانده شد",
      sessionId,
      expiresInSeconds: 120,
      ...((result.simulated || !result.success) && !isProduction ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("resendRegisterCode error:", err);
    res.status(500).json({ success: false, message: "خطا در ارسال پیامک" });
  }
};

// ─────────────── ورود (با نام کاربری یا شماره موبایل) ───────────────
const login = async (req, res) => {
  try {
    const { mobile, password } = req.customerBody;
    const identifier = String(mobile || "").trim();

    // جستجو با نام کاربری یا شماره موبایل
    let rows;
    if (/^09\d{9}$/.test(identifier)) {
      rows = await query(`SELECT * FROM customers WHERE mobile = ? LIMIT 1`, [identifier]);
    } else {
      rows = await query(`SELECT * FROM customers WHERE username = ? LIMIT 1`, [identifier]);
    }

    const customer = rows[0];
    if (!customer || !customer.password_hash) {
      return res.status(401).json({ success: false, message: "نام کاربری/شماره موبایل یا رمز عبور اشتباه است" });
    }
    if (!(await bcrypt.compare(String(password), customer.password_hash))) {
      await logAudit({
        actorType: "CUSTOMER",
        actorId: customer.id,
        actorName: customer.mobile,
        action: "CUSTOMER_LOGIN_FAILED",
        resource: "customer",
        resourceId: customer.id,
        ip: clientIp(req),
      });
      return res.status(401).json({ success: false, message: "نام کاربری/شماره موبایل یا رمز عبور اشتباه است" });
    }
    if (!customer.is_active) {
      try {
        const { sessionId, code, result } = await requestOtp(customer.mobile, "REGISTER");
        const isProduction = process.env.NODE_ENV === "production";
        if (result.success || !isProduction) {
          return res.json({
            success: true,
            needsVerification: true,
            message: "حساب شما هنوز تأیید نشده؛ کد تأیید جدید برایتان ارسال شد",
            sessionId,
            expiresInSeconds: 120,
            ...((result.simulated || !result.success) && !isProduction ? { devCode: code } : {}),
          });
        }
      } catch (err) {
        console.error("requestOtp failed during unverified login:", err);
      }
      return res.status(403).json({ success: false, message: "حساب شما تأیید نشده است؛ دوباره ثبت‌نام کنید تا کد تأیید ارسال شود" });
    }

    await query(`UPDATE customers SET last_login = NOW() WHERE id = ?`, [customer.id]);

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: customer.mobile,
      action: "CUSTOMER_LOGIN",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
    });

    res.json({
      success: true,
      message: "ورود موفق",
      token: customerToken(customer),
      customer: publicCustomer(customer),
    });
  } catch (err) {
    console.error("customer login error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── فراموشی رمز عبور: ارسال OTP ───────────────
const forgotPassword = async (req, res) => {
  try {
    const mobile = String(req.body.mobile || "").replace(/[\s-]/g, "");
    if (!isValidPhone(mobile)) {
      return res.status(400).json({ success: false, message: "شماره موبایل معتبر وارد کنید" });
    }

    const rows = await query(`SELECT id FROM customers WHERE mobile = ? AND password_hash IS NOT NULL LIMIT 1`, [mobile]);
    if (!rows[0]) {
      return res.status(200).json({
        success: true,
        message: "در صورت وجود حساب، کد تأیید ارسال می‌شود",
        ...(process.env.NODE_ENV !== "production" ? { hint: "no_account" } : {}),
      });
    }

    const { sessionId, code, result } = await requestOtp(mobile, "RESET_PASSWORD");
    const isProduction = process.env.NODE_ENV === "production";

    if (!result.success && isProduction) {
      return res.status(502).json({ success: false, message: "ارسال پیامک ناموفق بود؛ کمی بعد دوباره تلاش کنید" });
    }

    res.json({
      success: true,
      message: result.success ? "کد تأیید ارسال شد" : "ارسال پیامک ناموفق بود؛ کد فقط برای تست برگردانده شد",
      sessionId,
      expiresInSeconds: 120,
      ...((result.simulated || !result.success) && !isProduction ? { devCode: code } : {}),
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ success: false, message: "خطا در ارسال پیامک" });
  }
};

// ─────────────── فراموشی رمز عبور: تأیید OTP و صدور توکن بازنشانی ───────────────
const verifyForgotOtp = async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    const result = await verifyOtp(sessionId, code, "RESET_PASSWORD");

    if (!result.success) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const rows = await query(`SELECT id FROM customers WHERE mobile = ? LIMIT 1`, [result.phone]);
    if (!rows[0]) {
      return res.status(400).json({ success: false, message: "حسابی با این شماره یافت نشد" });
    }

    const resetToken = jwt.sign({ type: "reset", mobile: result.phone }, process.env.JWT_SECRET, {
      expiresIn: RESET_TOKEN_TTL,
    });

    res.json({ success: true, message: "کد تایید شد", resetToken, expiresInMinutes: 10 });
  } catch (err) {
    console.error("verifyForgotOtp error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── بازنشانی رمز عبور ───────────────
const resetPassword = async (req, res) => {
  try {
    const { password } = req.customerBody;
    const mobile = req.reset.mobile;

    const rows = await query(`SELECT id, password_hash, username FROM customers WHERE mobile = ? LIMIT 1`, [mobile]);
    const customer = rows[0];
    if (!customer) {
      return res.status(400).json({ success: false, message: "حسابی با این شماره یافت نشد" });
    }

    if (customer.password_hash && (await bcrypt.compare(password, customer.password_hash))) {
      return res.status(400).json({ success: false, message: "رمز جدید نباید با رمز قبلی یکسان باشد" });
    }

    const hash = await bcrypt.hash(password, 10);
    await query(`UPDATE customers SET password_hash = ? WHERE id = ?`, [hash, customer.id]);

    // ارسال پیامک اطلاع‌رسانی تغییر رمز
    try {
      const changeMsg = `سلام${customer.username ? ' ' + customer.username : ''}!\nرمز عبور حساب شما با موفقیت تغییر کرد.\nاگر شما این تغییر را انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.\nهتل باغ سرهنگ`;
      await sendSms(mobile, changeMsg, { type: "PASSWORD_CHANGED" });
    } catch (smsErr) {
      console.error("Failed to send password change SMS:", smsErr);
    }

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: mobile,
      action: "CUSTOMER_RESET_PASSWORD",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
    });

    res.json({ success: true, message: "رمز عبور با موفقیت بازنشانی شد" });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── تغییر رمز عبور (کاربر واردشده) ───────────────
const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.customerBody?.password || "");
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "رمز فعلی و رمز جدید الزامی است" });
    }

    const rows = await query(`SELECT id, password_hash, mobile, username FROM customers WHERE id = ? LIMIT 1`, [req.customer.id]);
    const customer = rows[0];
    if (!customer) {
      return res.status(404).json({ success: false, message: "حساب یافت نشد" });
    }
    if (!(await bcrypt.compare(currentPassword, customer.password_hash))) {
      return res.status(400).json({ success: false, message: "رمز عبور فعلی اشتباه است" });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ success: false, message: "رمز جدید نباید با رمز فعلی یکسان باشد" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE customers SET password_hash = ? WHERE id = ?`, [hash, customer.id]);

    // ارسال پیامک اطلاع‌رسانی تغییر رمز
    try {
      const changeMsg = `سلام${customer.username ? ' ' + customer.username : ''}!\nرمز عبور حساب شما با موفقیت تغییر کرد.\nاگر شما این تغییر را انجام نداده‌اید، فوراً با پشتیبانی تماس بگیرید.\nهتل باغ سرهنگ`;
      await sendSms(customer.mobile, changeMsg, { type: "PASSWORD_CHANGED" });
    } catch (smsErr) {
      console.error("Failed to send password change SMS:", smsErr);
    }

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: req.customer.mobile,
      action: "CUSTOMER_CHANGE_PASSWORD",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
    });

    res.json({ success: true, message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (err) {
    console.error("customer changePassword error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── خروج (ثبت Audit) ───────────────
const logout = async (req, res) => {
  try {
    await logAudit({
      actorType: "CUSTOMER",
      actorId: req.customer.id,
      actorName: req.customer.mobile,
      action: "CUSTOMER_LOGOUT",
      resource: "customer",
      resourceId: req.customer.id,
      ip: clientIp(req),
    });
    res.json({ success: true, message: "خروج موفق" });
  } catch (err) {
    console.error("customer logout error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── پروفایل ───────────────
const me = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, full_name, mobile, email, national_code, username, is_active, created_at, last_login FROM customers WHERE id = ? LIMIT 1`,
      [req.customer.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "حساب یافت نشد" });
    }
    res.json({ success: true, customer: publicCustomer(rows[0]) });
  } catch (err) {
    console.error("customer me error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── ویرایش پروفایل ───────────────
const updateProfile = async (req, res) => {
  try {
    const updates = req.profileUpdates;
    const fields = [];
    const params = [];
    if (updates.fullName) {
      fields.push("full_name = ?");
      params.push(updates.fullName);
    }
    if (updates.email !== undefined) {
      fields.push("email = ?");
      params.push(updates.email || null);
    }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: "موردی برای ویرایش وجود ندارد" });
    }

    params.push(req.customer.id);
    await query(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`, params);

    const rows = await query(`SELECT id, full_name, mobile, email, national_code, username, created_at FROM customers WHERE id = ? LIMIT 1`, [
      req.customer.id,
    ]);

    res.json({ success: true, message: "پروفایل با موفقیت ویرایش شد", customer: publicCustomer(rows[0]) });
  } catch (err) {
    console.error("customer updateProfile error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── رزروهای من ───────────────
const getMyReservations = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const mobile = req.customer.mobile;

    const rows = await query(
      `SELECT r.id, r.reservation_number, r.room_name, r.room_number, r.check_in, r.check_out,
              r.number_of_nights, r.number_of_guests, r.guest_name, r.price_per_night, r.total_price,
              r.status, r.payment_status, r.discount_code, r.discount_percent, r.discount_amount,
              r.created_at, r.paid_at
       FROM reservations r
       WHERE r.customer_id = ? OR (r.guest_phone = ? AND r.guest_phone <> '' AND r.customer_id IS NULL)
       ORDER BY r.created_at DESC`,
      [customerId, mobile]
    );

    // لینک کردن رزروهای بدون customer_id به مشتری
    const unlinked = rows.filter((r) => !r.customer_id);
    if (unlinked.length > 0) {
      const ids = unlinked.map((r) => r.id);
      await query(`UPDATE reservations SET customer_id = ? WHERE id IN (?)`, [customerId, ids]);
    }

    res.json({ success: true, reservations: rows });
  } catch (err) {
    console.error("getMyReservations error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── جزئیات رزرو ───────────────
const getReservationDetail = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const customerId = req.customer.id;
    const mobile = req.customer.mobile;

    const rows = await query(
      `SELECT * FROM reservations WHERE id = ? AND (customer_id = ? OR guest_phone = ?) LIMIT 1`,
      [reservationId, customerId, mobile]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    res.json({ success: true, reservation: rows[0] });
  } catch (err) {
    console.error("getReservationDetail error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── بررسی صلاحیت لغو رزرو ───────────────
const getCancellationEligibility = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const customerId = req.customer.id;
    const mobile = req.customer.mobile;

    const rows = await query(
      `SELECT * FROM reservations WHERE id = ? AND (customer_id = ? OR guest_phone = ?) LIMIT 1`,
      [reservationId, customerId, mobile]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    const reservation = rows[0];
    const { calculateCancellationEligibility } = require("../services/cancellationService");
    const eligibility = calculateCancellationEligibility(reservation);

    // بررسی درخواست لغو فعال
    const hasActiveRequest = reservation.status === "CANCELLATION_REQUESTED" || reservation.status === "REFUND_PENDING";

    res.json({
      success: true,
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      hoursRemaining: eligibility.hoursRemaining,
      hasActiveRequest,
      reservation: {
        id: reservation.id,
        reservation_number: reservation.reservation_number,
        room_name: reservation.room_name,
        check_in: reservation.check_in,
        check_out: reservation.check_out,
        total_price: reservation.total_price,
        status: reservation.status,
        payment_status: reservation.payment_status,
      },
    });
  } catch (err) {
    console.error("getCancellationEligibility error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد" });
  }
};

// ─────────────── لغو رزرو (ایجاد درخواست لغو و بازپرداخت) ───────────────
const cancelReservation = async (req, res) => {
  try {
    const reservationId = Number(req.params.id);
    const customerId = req.customer.id;
    const mobile = req.customer.mobile;
    const { refundCardNumber, refundCardHolderName } = req.body || {};

    const rows = await query(
      `SELECT * FROM reservations WHERE id = ? AND (customer_id = ? OR guest_phone = ?) LIMIT 1`,
      [reservationId, customerId, mobile]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    const reservation = rows[0];

    // بررسی وضعیت
    if (reservation.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "این رزرو قبلاً لغو شده است" });
    }
    if (reservation.status === "CANCELLATION_REQUESTED" || reservation.status === "REFUND_PENDING") {
      return res.status(400).json({ success: false, message: "درخواست لغو فعالی برای این رزرو وجود دارد" });
    }

    // ─── حالت ۱: رزرو پرداخت‌نشده → لغو ساده بدون بازپرداخت ───
    if (reservation.payment_status !== "SUCCESS") {
      await query(`UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`, [reservationId]);

      if (reservation.discount_code) {
        const { decrementDiscountUsage } = require("../services/discountService");
        await decrementDiscountUsage(reservation.discount_code);
      }

      createNotification({
        type: "CANCELLED",
        title: "رزرو کنسل شد",
        message: `رزرو ${reservation.reservation_number} — ${reservation.room_name} توسط مشتری کنسل شد`,
        refType: "reservation",
        refId: reservationId,
      });

      await logAudit({
        actorType: "CUSTOMER",
        actorId: customerId,
        actorName: mobile,
        action: "RESERVATION_CANCELLED",
        resource: "reservation",
        resourceId: reservationId,
        ip: clientIp(req),
      });

      return res.json({ success: true, message: "رزرو با موفقیت لغو شد" });
    }

    // ─── حالت ۲: رزرو پرداخت‌شده → نیاز به اطلاعات کارت بازپرداخت ───
    // بررسی صلاحیت لغو
    const { calculateCancellationEligibility } = require("../services/cancellationService");
    const eligibility = calculateCancellationEligibility(reservation);
    if (!eligibility.eligible) {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    // بررسی اطلاعات کارت بازپرداخت
    if (!refundCardNumber || !String(refundCardNumber).trim()) {
      return res.status(400).json({ success: false, message: "شماره کارت بازپرداخت الزامی است" });
    }
    if (!refundCardHolderName || !String(refundCardHolderName).trim()) {
      return res.status(400).json({ success: false, message: "نام صاحب کارت بازپرداخت الزامی است" });
    }

    // نرمال‌سازی شماره کارت (فقط ارقام)
    const normalizedCard = String(refundCardNumber).replace(/\D/g, "");
    if (normalizedCard.length !== 16) {
      return res.status(400).json({ success: false, message: "شماره کارت باید ۱۶ رقم باشد" });
    }

    // ایجاد درخواست بازپرداخت
    const { createRefundRequest } = require("../services/refundService");
    const result = await createRefundRequest({
      reservationId,
      customerId,
      refundCardNumber: normalizedCard,
      refundCardHolderName: String(refundCardHolderName).trim().slice(0, 100),
    });

    // اعلان مشتری
    try {
      const { createCustomerNotification } = require("../services/notificationService");
      await createCustomerNotification({
        customerId,
        type: "CANCELLATION_REQUESTED",
        title: "درخواست لغو رزرو ثبت شد",
        message: `درخواست لغو رزرو شماره ${reservation.reservation_number} ثبت شد و در انتظار بررسی مدیریت است.`,
        refType: "reservation",
        refId: reservationId,
      });
    } catch (e) {
      console.error("Failed to create customer notification:", e);
    }

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customerId,
      actorName: mobile,
      action: "CANCELLATION_REQUESTED",
      resource: "reservation",
      resourceId: reservationId,
      ip: clientIp(req),
      metadata: { refundId: result.refundId },
    });

    res.json({
      success: true,
      message: "درخواست لغو رزرو شما ثبت شد و در انتظار بررسی مدیریت است.",
      refundId: result.refundId,
    });
  } catch (err) {
    console.error("cancelReservation error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── اعلان‌های مشتری ───────────────
const getNotifications = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const rows = await query(
      `SELECT * FROM customer_notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
      [customerId]
    );
    const unreadCount = await query(
      `SELECT COUNT(*) as count FROM customer_notifications WHERE customer_id = ? AND is_read = 0`,
      [customerId]
    );
    res.json({
      success: true,
      notifications: rows,
      unreadCount: unreadCount[0]?.count || 0,
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

// ─────────────── خواندن اعلان ───────────────
const markNotificationRead = async (req, res) => {
  try {
    const notifId = Number(req.params.id);
    const customerId = req.customer.id;
    await query(
      `UPDATE customer_notifications SET is_read = 1 WHERE id = ? AND customer_id = ?`,
      [notifId, customerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res.status(500).json({ success: false, message: "خطا" });
  }
};

// ─────────────── خواندن همه اعلان‌ها ───────────────
const markAllNotificationsRead = async (req, res) => {
  try {
    const customerId = req.customer.id;
    await query(
      `UPDATE customer_notifications SET is_read = 1 WHERE customer_id = ? AND is_read = 0`,
      [customerId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    res.status(500).json({ success: false, message: "خطا" });
  }
};

// ─────────────── آمار داشبورد ───────────────
const getDashboardStats = async (req, res) => {
  try {
    const customerId = req.customer.id;
    const mobile = req.customer.mobile;

    const totalReservations = await query(
      `SELECT COUNT(*) as count FROM reservations WHERE customer_id = ? OR (guest_phone = ? AND guest_phone <> '' AND customer_id IS NULL)`,
      [customerId, mobile]
    );
    const upcomingReservations = await query(
      `SELECT COUNT(*) as count FROM reservations WHERE (customer_id = ? OR guest_phone = ?) AND status IN ('CONFIRMED','PENDING') AND check_in >= CURDATE()`,
      [customerId, mobile]
    );
    const totalSpent = await query(
      `SELECT COALESCE(SUM(total_price), 0) as total FROM reservations WHERE (customer_id = ? OR guest_phone = ?) AND payment_status = 'SUCCESS'`,
      [customerId, mobile]
    );
    const completedStays = await query(
      `SELECT COUNT(*) as count FROM reservations WHERE (customer_id = ? OR guest_phone = ?) AND status = 'CHECKED_OUT'`,
      [customerId, mobile]
    );
    const unreadNotifications = await query(
      `SELECT COUNT(*) as count FROM customer_notifications WHERE customer_id = ? AND is_read = 0`,
      [customerId]
    );

    res.json({
      success: true,
      stats: {
        totalReservations: totalReservations[0]?.count || 0,
        upcomingReservations: upcomingReservations[0]?.count || 0,
        totalSpent: totalSpent[0]?.total || 0,
        completedStays: completedStays[0]?.count || 0,
        unreadNotifications: unreadNotifications[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error("getDashboardStats error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد" });
  }
};

module.exports = {
  register,
  verifyRegister,
  resendRegisterCode,
  login,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  changePassword,
  logout,
  me,
  updateProfile,
  getMyReservations,
  getReservationDetail,
  getCancellationEligibility,
  cancelReservation,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getDashboardStats,
};
