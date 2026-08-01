const { query } = require("../config/db");
const { requestPayment, verifyPayment, zarinpalConfigured } = require("../services/zarinpalService");
const { sendPaymentConfirmed } = require("../services/smsService");

// ─────────────── درخواست پرداخت (رفتن به درگاه) ───────────────
const requestPaymentController = async (req, res) => {
  try {
    const reservationId = Number(req.body.reservationId);
    if (!reservationId) {
      return res.status(400).json({ success: false, message: "شناسه رزرو الزامی است" });
    }

    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [reservationId]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    if (reservation.payment_status === "SUCCESS") {
      return res.status(409).json({ success: false, message: "این رزرو قبلاً پرداخت شده است" });
    }

    if (!zarinpalConfigured()) {
      // حالت توسعه بدون درگاه: مستقیماً تایید می‌شود
      return res.json({
        success: true,
        mode: "manual",
        message: "درگاه زرین‌پال تنظیم نشده است — پرداخت به صورت دستی تایید شد",
        paymentURL: null,
        reservationId,
      });
    }

    const callbackUrl = `${process.env.FRONTEND_URL}/payment/result`;
    const { authority, paymentURL } = await requestPayment({
      amount: reservation.total_price,
      description: `رزرو ${reservation.reservation_number} - ${reservation.room_name}`,
      orderId: reservation.id,
      callbackUrl,
    });

    // ذخیره authority روی رزرو و ثبت لاگ پرداخت
    await query(`UPDATE reservations SET authority = ? WHERE id = ?`, [authority, reservation.id]);
    await query(
      `INSERT INTO reservation_payments (reservation_id, amount, authority, status, created_at)
       VALUES (?, ?, ?, 'INITIATED', NOW())
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), authority = VALUES(authority), status = 'INITIATED'`,
      [reservation.id, reservation.total_price, authority]
    );

    res.json({
      success: true,
      mode: "gateway",
      authority,
      paymentURL,
      amount: reservation.total_price,
      reservationId: reservation.id,
    });
  } catch (err) {
    console.error("requestPayment error:", err);
    const status = err.code === "ZARINPAL_NOT_CONFIGURED" ? 400 : 502;
    res.status(status).json({ success: false, message: err.message || "خطا در اتصال به درگاه پرداخت" });
  }
};

// ─────────────── تایید پرداخت (بازگشت از درگاه) ───────────────
const verifyPaymentController = async (req, res) => {
  try {
    const { authority, status, reservationId } = req.query;
    const rid = Number(reservationId);
    if (!rid || !authority) {
      return res.status(400).json({ success: false, message: "پارامترهای پرداخت نامعتبر است" });
    }

    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [rid]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    if (reservation.payment_status === "SUCCESS") {
      return res.json({
        success: true,
        message: "پرداخت قبلاً تایید شده است",
        reservationNumber: reservation.reservation_number,
      });
    }

    if (status === "NOK" || !zarinpalConfigured()) {
      // لغو پرداخت توسط کاربر یا حالت توسعه
      await query(
        `UPDATE reservations SET payment_status = 'FAILED' WHERE id = ? AND payment_status <> 'SUCCESS'`,
        [rid]
      );
      return res.json({
        success: false,
        message: "پرداخت انجام نشد یا لغو شد",
        reservationNumber: reservation.reservation_number,
      });
    }

    const verify = await verifyPayment({ authority, amount: reservation.total_price });

    if (!verify.success) {
      await query(`UPDATE reservations SET payment_status = 'FAILED' WHERE id = ?`, [rid]);
      return res.json({
        success: false,
        message: `پرداخت تایید نشد (${verify.message || "خطای زرین‌پال"})`,
        reservationNumber: reservation.reservation_number,
      });
    }

    const now = new Date();
    await query(
      `UPDATE reservations
       SET status = 'CONFIRMED', payment_status = 'SUCCESS', ref_id = ?, paid_at = ?, updated_at = ?
       WHERE id = ?`,
      [verify.refId, now, now, rid]
    );

    await query(
      `UPDATE reservation_payments SET ref_id = ?, status = 'SUCCESS' WHERE reservation_id = ?`,
      [verify.refId, rid]
    );

    // پیامک تایید پرداخت
    const sms = await sendPaymentConfirmed({
      phone: reservation.guest_phone,
      reservationNumber: reservation.reservation_number,
      totalPrice: reservation.total_price,
      reservationId: rid,
    });
    await query(`UPDATE reservations SET sms_status = ? WHERE id = ?`, [sms.success ? "SENT" : "FAILED", rid]);

    res.json({
      success: true,
      message: "پرداخت با موفقیت انجام شد",
      refId: verify.refId,
      reservationNumber: reservation.reservation_number,
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ success: false, message: err.message || "خطا در تایید پرداخت" });
  }
};

// تایید دستی پرداخت در حالت توسعه (بدون زرین‌پال)
const manualConfirmPayment = async (req, res) => {
  try {
    const reservationId = Number(req.body.reservationId);
    if (!reservationId) {
      return res.status(400).json({ success: false, message: "شناسه رزرو الزامی است" });
    }

    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [reservationId]);
    const reservation = rows[0];
    if (!reservation) {
      return res.status(404).json({ success: false, message: "رزرو یافت نشد" });
    }

    const now = new Date();
    await query(
      `UPDATE reservations
       SET status = 'CONFIRMED', payment_status = 'SUCCESS', ref_id = 'MANUAL', paid_at = ?, updated_at = ?
       WHERE id = ?`,
      [now, now, reservationId]
    );

    const sms = await sendPaymentConfirmed({
      phone: reservation.guest_phone,
      reservationNumber: reservation.reservation_number,
      totalPrice: reservation.total_price,
      reservationId,
    });
    await query(`UPDATE reservations SET sms_status = ? WHERE id = ?`, [sms.success ? "SENT" : "FAILED", reservationId]);

    res.json({
      success: true,
      message: "پرداخت به صورت دستی تایید شد",
      reservationNumber: reservation.reservation_number,
    });
  } catch (err) {
    console.error("manualConfirmPayment error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { requestPaymentController, verifyPaymentController, manualConfirmPayment };
