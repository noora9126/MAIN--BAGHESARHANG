/*
 * Payment Service (orchestration پرداخت واریزا)
 * ─────────────────────────────────────────────
 * منطق کسب‌وکار پرداخت اینجاست؛ Controllerها تمیز نگه داشته می‌شوند.
 *
 * تضمین‌ها:
 * - مبلغ فقط از رکورد Order در دیتابیس خوانده می‌شود (نه Frontend)
 * - برای هر Order فقط یک لینک فعال همزمان ساخته می‌شود (row lock)
 * - Webhook فقط با امضای HMAC-SHA256 معتبر روی RAW BODY پذیرفته می‌شود
 * - Fulfillment (Payment→paid + Reservation→CONFIRMED/SUCCESS) تراکنشی است
 * - Idempotency کامل با X-Delivery-Id و وضعیت Payment
 */

const { pool, query } = require("../config/db");
const {
  varizaConfigured,
  createPaymentLink,
  verifyWebhookSignature,
  parseWebhookEvent,
} = require("./varizaService");
const { sendPaymentConfirmed } = require("./smsService");
const { createNotification } = require("./notificationService");
const { logPaymentEvent, logPaymentWarning, logPaymentError } = require("../utils/paymentLogger");

function paymentError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  if (status) err.status = status;
  return err;
}

function toMysqlDatetime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function frontendReturnBase() {
  const base = process.env.FRONTEND_URL || "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);
  // طبق مستندات واریزا، return_url باید با https:// شروع شود
  if (!base.startsWith("https://") && !isLocal) return null;
  return base.replace(/\/+$/, "");
}

/*
 * ───────────── ساخت پرداخت برای یک رزرو ─────────────
 * اگر لینک فعالِ معتبری از قبل وجود داشته باشد همان برگردانده می‌شود
 * و لینک جدیدی ساخته نمی‌شود.
 */
async function createVarizaPayment(reservationId) {
  if (!varizaConfigured()) {
    throw paymentError(
      "VARIZA_NOT_CONFIGURED",
      "پرداخت کارت‌به‌کارت موقتاً در دسترس نیست. لطفاً با پشتیبانی هتل تماس بگیرید.",
      503,
    );
  }

  const returnBase = frontendReturnBase();
  if (!returnBase) {
    logPaymentError("payment_config_error", { reason: "FRONTEND_URL must start with https://" });
    throw paymentError(
      "VARIZA_BAD_CONFIG",
      "آدرس بازگشت پرداخت تنظیم نشده است (FRONTEND_URL باید HTTPS باشد)",
      500,
    );
  }

  const rid = Number(reservationId);
  if (!Number.isInteger(rid) || rid <= 0) {
    throw paymentError("RESERVATION_INVALID", "شناسه رزرو نامعتبر است", 400);
  }

  // pool در db.js به‌صورت callback-style است؛ برای تراکنش از promise API استفاده می‌کنیم
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    // قفل رکورد رزرو تا موازی‌سازی درخواست‌ها باعث ساخت چند لینک نشود
    const [rows] = await conn.execute(`SELECT * FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE`, [rid]);
    const reservation = rows[0];
    if (!reservation) {
      await conn.rollback();
      throw paymentError("RESERVATION_NOT_FOUND", "رزرو یافت نشد", 404);
    }

    if (reservation.payment_status === "SUCCESS") {
      await conn.rollback();
      throw paymentError("RESERVATION_ALREADY_PAID", "این رزرو قبلاً پرداخت شده است", 409);
    }
    if (reservation.status === "CANCELLED") {
      await conn.rollback();
      throw paymentError("RESERVATION_CANCELLED", "این رزرو لغو شده است", 409);
    }
    if (!reservation.total_price || Number(reservation.total_price) < 1000) {
      await conn.rollback();
      throw paymentError("VARIZA_AMOUNT_TOO_LOW", "مبلغ سفارش برای پرداخت آنلاین معتبر نیست", 400);
    }

    // لینک فعال موجود؟ (بدون دلیل جدید نساز)
    const [active] = await conn.execute(
      `SELECT * FROM variza_payments
        WHERE reservation_id = ? AND status = 'pending'
          AND provider_slug IS NOT NULL AND payment_url IS NOT NULL
          AND expires_at IS NOT NULL AND expires_at > NOW()
        ORDER BY id DESC LIMIT 1 FOR UPDATE`,
      [rid],
    );
    if (active[0]) {
      await conn.commit();
      logPaymentEvent("payment_reused", {
        reservationId: rid,
        slug: active[0].provider_slug,
      });
      return {
        reused: true,
        payUrl: active[0].payment_url,
        slug: active[0].provider_slug,
        amount: Number(active[0].amount),
        expiresAt: active[0].expires_at,
        reservationNumber: reservation.reservation_number,
      };
    }

    // لینک‌های pending منقضی/قدیمی را کنسل کن
    await conn.execute(
      `UPDATE variza_payments SET status = 'cancelled'
        WHERE reservation_id = ? AND status = 'pending'`,
      [rid],
    );

    // مبلغ واقعی سفارش — فقط از دیتابیس
    const amount = Number(reservation.total_price);
    const title = `Order #${reservation.reservation_number}`;
    const returnUrlBase = `${returnBase}/payment/result?provider=variza&reservationId=${rid}`;

    // فراخوانی API واریزا داخل قفل؛ خطا → rollback → Order سالم می‌ماند
    const link = await createPaymentLink({ amount, returnUrl: returnUrlBase, title });

    const returnUrl = `${returnUrlBase}&slug=${encodeURIComponent(link.slug)}`;
    const expiresAt = link.expiresAt ? toMysqlDatetime(link.expiresAt) : null;

    const [ins] = await conn.execute(
      `INSERT INTO variza_payments
         (reservation_id, provider, provider_slug, amount, status, payment_url, expires_at, created_at, updated_at)
       VALUES (?, 'variza', ?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [rid, link.slug, amount, link.payUrl, expiresAt],
    );

    await conn.commit();

    logPaymentEvent("payment_created", {
      reservationId: rid,
      paymentId: ins.insertId,
      slug: link.slug,
      amount,
      expiresAt,
    });

    return {
      reused: false,
      payUrl: link.payUrl,
      slug: link.slug,
      amount,
      expiresAt,
      reservationNumber: reservation.reservation_number,
    };
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* rollback بعد از commit خودکار بی‌اثر است */
    }
    if (!err.code || !String(err.code).startsWith("VARIZA")) {
      logPaymentError("payment_create_failed", { reservationId }, err);
    }
    throw err;
  } finally {
    conn.release();
  }
}

/*
 * ───────────── Webhook امضاشده واریزا ─────────────
 * تمام اعتبارسنجی‌ها اینجا انجام می‌شود؛ Controller فقط HTTP map می‌کند.
 */
async function handleVarizaWebhook({ rawBody, signature, deliveryId }) {
  // ۱) امضا روی RAW BODY
  if (!verifyWebhookSignature(rawBody, signature)) {
    logPaymentWarning("webhook_signature_invalid", { deliveryId: deliveryId || null });
    return { ok: "invalid_signature", httpStatus: 400 };
  }

  // ۲) بدنه JSON معتبر
  const payload = parseWebhookEvent(rawBody);
  if (!payload) {
    logPaymentWarning("webhook_bad_payload", { deliveryId: deliveryId || null });
    return { ok: "bad_payload", httpStatus: 400 };
  }

  const event = String(payload.event || "");
  const slug = payload.slug ? String(payload.slug) : null;
  const attemptCode = payload.attempt_code ? String(payload.attempt_code) : null;
  const paidAmount = Number(payload.amount);

  logPaymentEvent("webhook_received", { event, slug, attemptCode, deliveryId: deliveryId || null });

  // فقط event معتبر رسمی پردازش می‌شود؛ بقیه ACK می‌شوند (200) تا retry متوقف شود
  if (event !== "payment.paid") {
    return { ok: "ignored_event", event, httpStatus: 200 };
  }

  // pool در db.js به‌صورت callback-style است؛ برای تراکنش از promise API استفاده می‌کنیم
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    // ۳) Idempotency سطح Delivery (وب‌هوک تکراری هرگز دوباره Fulfill نمی‌شود)
    if (deliveryId) {
      try {
        await conn.execute(
          `INSERT INTO payment_webhook_deliveries (provider, delivery_id, event, created_at)
           VALUES ('variza', ?, ?, NOW())`,
          [String(deliveryId), event],
        );
      } catch (e) {
        if (e && e.code === "ER_DUP_ENTRY") {
          await conn.rollback();
          logPaymentEvent("payment_duplicate", { deliveryId, slug });
          return { ok: "duplicate", httpStatus: 200 };
        }
        throw e;
      }
    }

    // ۴) slug باید به یک Payment واقعی اشاره کند
    const [payRows] = await conn.execute(
      `SELECT * FROM variza_payments WHERE provider_slug = ? LIMIT 1 FOR UPDATE`,
      [slug],
    );
    const payment = payRows[0];
    if (!payment) {
      await conn.commit(); // delivery ثبت بماند تا retry همان unknown دوباره ACK شود
      logPaymentWarning("webhook_unknown_slug", { slug, attemptCode, deliveryId: deliveryId || null });
      return { ok: "unknown_slug", httpStatus: 200 };
    }

    // ۵) قبلاً پردازش شده؟ هیچ عملیات حساسی دوباره اجرا نمی‌شود
    if (payment.status === "paid") {
      await conn.rollback();
      logPaymentEvent("payment_duplicate", { slug, deliveryId: deliveryId || null });
      return { ok: "already_paid", httpStatus: 200 };
    }
    if (payment.status === "failed" || payment.status === "cancelled" || payment.status === "expired") {
      await conn.rollback();
      logPaymentWarning("webhook_for_terminal_payment", { slug, paymentStatus: payment.status });
      return { ok: "already_paid", httpStatus: 200 };
    }

    // ۶) تطبیق مبلغ
    //    طبق مستندات رسمی، مبلغ وبهوک ممکن است برای شناسایی تراکنش کمی بیشتر از
    //    مبلغ پایه لینک باشد (مثال مستندات: لینک ۵۰۰٬۰۰۰ ← وبهوک ۵۰۰٬۱۲۸).
    //    بنابراین: پرداختِ کمتر از مبلغ پایه، یا بیش از حد تلورانس، رد می‌شود.
    const expected = Number(payment.amount);
    const tolerancePct = Number(process.env.VARIZA_AMOUNT_TOLERANCE_PERCENT || 5);
    const maxAllowed = Math.ceil(expected * (1 + tolerancePct / 100));
    const amountValid =
      Number.isFinite(paidAmount) && paidAmount >= expected && paidAmount <= maxAllowed;

    if (!amountValid) {
      await conn.execute(
        `UPDATE variza_payments SET status = 'failed', updated_at = NOW() WHERE id = ?`,
        [payment.id],
      );
      await conn.commit();
      logPaymentWarning("payment_amount_mismatch", {
        slug,
        paymentId: payment.id,
        expectedAmount: expected,
        receivedAmount: paidAmount,
        tolerancePct,
      });
      return { ok: "amount_mismatch", httpStatus: 409 };
    }

    // ۷) ثبت تحویل روی رکورد پرداخت + Paid
    await conn.execute(
      `UPDATE variza_payments
          SET status = 'paid',
              attempt_code = ?,
              delivery_id = ?,
              paid_at = NOW(),
              updated_at = NOW()
        WHERE id = ?`,
      [attemptCode, deliveryId ? String(deliveryId) : null, payment.id],
    );

    // ۸) Paid کردن سفارش — تراکنشی همراه Payment
    const [res] = await conn.execute(
      `UPDATE reservations
          SET status = 'CONFIRMED', payment_status = 'SUCCESS',
              ref_id = ?, paid_at = NOW(), updated_at = NOW()
        WHERE id = ? AND payment_status <> 'SUCCESS'`,
      [attemptCode || slug, payment.reservation_id],
    );

    await conn.commit();

    logPaymentEvent("payment_paid", {
      slug,
      attemptCode,
      paymentId: payment.id,
      reservationId: payment.reservation_id,
      amount: paidAmount,
      rowsAffected: res.affectedRows,
    });

    // ۹) عملیات تکمیلی خارج از تراکنش (خرابی‌شان پرداخت را باطل نمی‌کند)
    fulfillAftercare(payment.reservation_id, paidAmount).catch(() => {});

    return { ok: "fulfilled", httpStatus: 200, reservationId: payment.reservation_id };
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      /* ignore */
    }
    logPaymentError("webhook_processing_failed", { slug, deliveryId: deliveryId || null }, err);
    return { ok: "processing_failed", httpStatus: 500 };
  } finally {
    conn.release();
  }
}

// پیامک تأیید + نوتیفیکیشن ادمین — best-effort
async function fulfillAftercare(reservationId, paidAmount) {
  try {
    const rows = await query(`SELECT * FROM reservations WHERE id = ? LIMIT 1`, [reservationId]);
    const reservation = rows[0];
    if (!reservation) return;

    const sms = await sendPaymentConfirmed({
      phone: reservation.guest_phone,
      reservationNumber: reservation.reservation_number,
      totalPrice: paidAmount || reservation.total_price,
      reservationId,
    });
    await query(`UPDATE reservations SET sms_status = ? WHERE id = ?`, [
      sms && sms.success ? "SENT" : "FAILED",
      reservationId,
    ]);
  } catch (err) {
    logPaymentError("fulfill_aftercare_failed", { reservationId }, err);
  }

  try {
    await createNotification({
      type: "PAYMENT_CONFIRMED",
      title: "پرداخت تایید شد",
      message: `پرداخت کارت‌به‌کارت رزرو #${reservationId} به مبلغ ${Number(paidAmount || 0).toLocaleString("fa-IR")} تومان تأیید شد (واریزا)`,
      refType: "reservation",
      refId: reservationId,
    });
  } catch (err) {
    logPaymentError("fulfill_notification_failed", { reservationId }, err);
  }
}

/*
 * ───────────── وضعیت پرداخت برای Return URL / Polling ─────────────
 */
async function getVarizaPaymentStatus(reservationId) {
  const rid = Number(reservationId);
  if (!Number.isInteger(rid) || rid <= 0) {
    throw paymentError("RESERVATION_INVALID", "شناسه رزرو نامعتبر است", 400);
  }

  const rows = await query(
    `SELECT vp.id, vp.provider_slug, vp.amount, vp.status AS payment_status,
            vp.expires_at, vp.paid_at,
            r.reservation_number, r.payment_status AS reservation_payment_status
       FROM variza_payments vp
       JOIN reservations r ON r.id = vp.reservation_id
      WHERE vp.reservation_id = ?
      ORDER BY vp.id DESC LIMIT 1`,
    [rid],
  );

  const payment = rows[0] || null;
  const orderPaid = payment ? payment.reservation_payment_status === "SUCCESS" : false;

  return {
    success: true,
    found: Boolean(payment),
    orderPaid,
    paymentStatus: payment ? payment.payment_status : null,
    amount: payment ? Number(payment.amount) : null,
    expiresAt: payment ? payment.expires_at : null,
    paidAt: payment ? payment.paid_at : null,
    reservationNumber: payment ? payment.reservation_number : null,
  };
}

module.exports = {
  createVarizaPayment,
  handleVarizaWebhook,
  getVarizaPaymentStatus,
};
