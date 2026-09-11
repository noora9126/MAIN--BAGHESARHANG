const { query } = require("../config/db");
const { requestPayment, verifyPayment, zarinpalConfigured } = require("../services/zarinpalService");
const { sendPaymentConfirmed } = require("../services/smsService");
const { createNotification } = require("../services/notificationService");
const {
  createVarizaPayment,
  handleVarizaWebhook,
  getVarizaPaymentStatus,
} = require("../services/paymentService");
const { logPaymentError, logPaymentWarning } = require("../utils/paymentLogger");

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

    createNotification({
      type: "PAYMENT_CONFIRMED",
      title: "پرداخت تایید شد",
      message: `پرداخت رزرو ${reservation.reservation_number} به مبلغ ${reservation.total_price.toLocaleString("fa-IR")} تومان انجام شد`,
      refType: "reservation",
      refId: rid,
    });

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

// تایید دستی پرداخت — به‌طور پیش‌فرض برای همیشه قفل است.
// فقط با ENABLE_MANUAL_PAYMENT_CONFIRM=1 در .env (حالت تست توسعه‌دهنده) باز می‌شود.
const manualConfirmPayment = async (req, res) => {
  try {
    const manualAllowed = process.env.ENABLE_MANUAL_PAYMENT_CONFIRM === "1";
    if (!manualAllowed) {
      return res.status(403).json({
        success: false,
        message: "تایید دستی پرداخت غیرفعال است",
      });
    }
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

    createNotification({
      type: "PAYMENT_CONFIRMED",
      title: "پرداخت تایید شد",
      message: `پرداخت رزرو ${reservation.reservation_number} به مبلغ ${reservation.total_price.toLocaleString("fa-IR")} تومان انجام شد`,
      refType: "reservation",
      refId: reservationId,
    });

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

/* ═══════════════════ واریزا (کارت‌به‌کارت) ═══════════════════ */

const VARIZA_CREATE_ERROR_STATUS = {
  VARIZA_NOT_CONFIGURED: 503,
  VARIZA_BAD_CONFIG: 500,
  VARIZA_AMOUNT_TOO_LOW: 400,
  RESERVATION_INVALID: 400,
  RESERVATION_NOT_FOUND: 404,
  RESERVATION_ALREADY_PAID: 409,
  RESERVATION_CANCELLED: 409,
  VARIZA_AUTH_FAILED: 502,
  VARIZA_VALIDATION: 502,
  VARIZA_INVALID_RESPONSE: 502,
  VARIZA_RATE_LIMITED: 429,
  VARIZA_TIMEOUT: 504,
  VARIZA_UNAVAILABLE: 503,
};

// POST /api/payments/variza/create  — ساخت لینک پرداخت اختصاصی سفارش
const createVarizaPaymentController = async (req, res) => {
  try {
    const reservationId = Number(req.body?.reservationId);
    const result = await createVarizaPayment(reservationId);
    return res.json({
      success: true,
      payUrl: result.payUrl,
      slug: result.slug,
      amount: result.amount,
      expiresAt: result.expiresAt,
      reused: Boolean(result.reused),
      reservationNumber: result.reservationNumber,
      message: result.reused
        ? "لینک پرداخت فعال شما بازگردانده شد"
        : "لینک پرداخت ساخته شد",
    });
  } catch (err) {
    const status =
      VARIZA_CREATE_ERROR_STATUS[err.code] || Number(err.status) || 500;
    if (!VARIZA_CREATE_ERROR_STATUS[err.code]) {
      logPaymentError("payment_create_controller_failed", { reservationId: req.body?.reservationId }, err);
      return res.status(500).json({ success: false, message: "خطا در ایجاد پرداخت. لطفاً دوباره تلاش کنید" });
    }
    logPaymentWarning("payment_create_variza_error", {
      reservationId: req.body?.reservationId,
      code: err.code,
    });
    // err.message برای خطاهای نگاشت‌شده، پیام امن فارسی است
    return res.status(status).json({ success: false, message: err.message });
  }
};

// POST /api/payments/variza/webhook — Webhook امضاشده واریزا (عمومی، بدون Login)
const varizaWebhookController = async (req, res) => {
  const signature = req.get("X-Webhook-Signature");
  const deliveryId = req.get("X-Delivery-Id");
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body ?? {}), "utf8");

  const result = await handleVarizaWebhook({ rawBody, signature, deliveryId });

  switch (result.ok) {
    case "invalid_signature":
    case "bad_payload":
      return res.status(400).json({ received: false });
    case "amount_mismatch":
      return res.status(409).json({ received: false, reason: "amount_mismatch" });
    case "processing_failed":
      return res.status(500).json({ received: false });
    default:
      // fulfilled / duplicate / already_paid / unknown_slug / ignored_event → ACK
      return res.status(200).json({ received: true });
  }
};

// GET /api/payments/variza/status?reservationId= — بررسی واقعی وضعیت پس از برگشت
const varizaPaymentStatusController = async (req, res) => {
  try {
    const reservationId = Number(req.query.reservationId);
    const status = await getVarizaPaymentStatus(reservationId);
    return res.json(status);
  } catch (err) {
    if (err.code === "RESERVATION_INVALID") {
      return res.status(400).json({ success: false, message: err.message });
    }
    logPaymentError("payment_status_controller_failed", { reservationId: req.query.reservationId }, err);
    return res.status(500).json({ success: false, message: "خطا در دریافت وضعیت پرداخت" });
  }
};

// GET /api/payments/variza/config-status — فقط boolean؛ برای تشخیص تنظیم بودن درگاه
const varizaConfigStatusController = async (_req, res) => {
  const { apiKeyConfigured, webhookSecretConfigured, varizaConfigured } = require("../services/varizaService");
  return res.json({
    success: true,
    apiKeySet: apiKeyConfigured(),
    webhookSecretSet: webhookSecretConfigured(),
    configured: varizaConfigured(),
  });
};

module.exports.createVarizaPaymentController = createVarizaPaymentController;
module.exports.varizaWebhookController = varizaWebhookController;
module.exports.varizaPaymentStatusController = varizaPaymentStatusController;
module.exports.varizaConfigStatusController = varizaConfigStatusController;
