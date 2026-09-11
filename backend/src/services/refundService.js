const { pool, query } = require("../config/db");
const { createNotification, createCustomerNotification } = require("./notificationService");
const { logAudit, clientIp } = require("./auditLogService");

// ─────────────── ثابت‌های وضعیت ───────────────
const REFUND_STATUSES = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

const REFUND_STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده",
  PAID: "واریز انجام شد",
  REJECTED: "رد شد",
  CANCELLED: "لغو شد",
};

// ─────────────── دریافت درخواست لغو/بازپرداخت ───────────────
async function getRefundById(id) {
  const rows = await query(
    `SELECT r.*, res.reservation_number, res.room_name, res.room_number,
            res.guest_name, res.guest_phone, res.guest_email,
            res.check_in, res.check_out, res.total_price, res.status AS reservation_status,
            res.payment_status, res.ref_id
     FROM refunds r
     JOIN reservations res ON res.id = r.reservation_id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

// ─────────────── لیست درخواست‌ها ───────────────
async function listRefunds({ status, search, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push("r.status = ?");
    params.push(status);
  }
  if (search) {
    conditions.push(
      "(res.reservation_number LIKE ? OR res.guest_name LIKE ? OR res.guest_phone LIKE ?)"
    );
    const like = `%${String(search).trim()}%`;
    params.push(like, like, like);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM refunds r
     JOIN reservations res ON res.id = r.reservation_id
     ${where}`,
    params
  );

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (pageNum - 1) * limitNum;

  const rows = await query(
    `SELECT r.*, res.reservation_number, res.room_name, res.room_number,
            res.guest_name, res.guest_phone, res.guest_email,
            res.check_in, res.check_out, res.total_price, res.status AS reservation_status,
            res.payment_status
     FROM refunds r
     JOIN reservations res ON res.id = r.reservation_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limitNum, offset]
  );

  return {
    refunds: rows,
    total: countRows[0].total,
    page: pageNum,
    pages: Math.ceil(countRows[0].total / limitNum),
  };
}

// ─────────────── ایجاد درخواست لغو/بازپرداخت ───────────────
async function createRefundRequest({ reservationId, customerId, refundCardNumber, refundCardHolderName }) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    // قفل رکورد رزرو
    const [rows] = await conn.execute(
      `SELECT * FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE`,
      [reservationId]
    );
    const reservation = rows[0];
    if (!reservation) {
      await conn.rollback();
      throw new Error("رزرو یافت نشد");
    }

    // بررسی اینکه قبلاً درخواست لغو فعال وجود ندارد
    const [existingRefund] = await conn.execute(
      `SELECT id FROM refunds WHERE reservation_id = ? AND status IN ('PENDING', 'APPROVED') LIMIT 1`,
      [reservationId]
    );
    if (existingRefund.length > 0) {
      await conn.rollback();
      throw new Error("درخواست لغو فعالی برای این رزرو وجود دارد");
    }

    // به‌روزرسانی وضعیت رزرو
    await conn.execute(
      `UPDATE reservations SET status = 'CANCELLATION_REQUESTED', updated_at = NOW() WHERE id = ?`,
      [reservationId]
    );

    // ذخیره اطلاعات کارت بازپرداخت روی رزرو
    await conn.execute(
      `UPDATE reservations SET refund_card_number = ?, refund_card_holder_name = ? WHERE id = ?`,
      [refundCardNumber, refundCardHolderName, reservationId]
    );

    // ایجاد رکورد بازپرداخت
    const [ins] = await conn.execute(
      `INSERT INTO refunds (reservation_id, requested_by, amount, refund_card_number, refund_card_holder_name, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [reservationId, customerId, reservation.total_price, refundCardNumber, refundCardHolderName]
    );

    await conn.commit();

    const refundId = ins.insertId;

    // اعلان ادمین
    createNotification({
      type: "CANCELLATION_REQUESTED",
      title: "درخواست لغو رزرو جدید",
      message: `درخواست لغو رزرو ${reservation.reservation_number} — ${reservation.room_name} (مبلغ: ${Number(reservation.total_price).toLocaleString("fa-IR")} تومان)`,
      refType: "refund",
      refId: refundId,
    });

    return { refundId, reservation };
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────── تایید و پردازش بازپرداخت توسط ادمین ───────────────
async function approveRefund({ refundId, adminId, adminName }) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM refunds WHERE id = ? LIMIT 1 FOR UPDATE`,
      [refundId]
    );
    const refund = rows[0];
    if (!refund) {
      await conn.rollback();
      throw new Error("درخواست بازپرداخت یافت نشد");
    }
    if (refund.status !== "PENDING") {
      await conn.rollback();
      throw new Error("این درخواست قبلاً پردازش شده است");
    }

    // اعتبارسنجی مجدد وضعیت رزرو (بر اساس توصیه: حفظ صلاحیت بر اساس زمان درخواست)
    const [resRows] = await conn.execute(
      `SELECT id, status, payment_status, total_price FROM reservations WHERE id = ? LIMIT 1`,
      [refund.reservation_id]
    );
    const reservation = resRows[0];
    if (!reservation) {
      await conn.rollback();
      throw new Error("رزرو مرتبط یافت نشد");
    }
    if (reservation.status === "CANCELLED" || reservation.status === "CHECKED_OUT") {
      await conn.rollback();
      throw new Error("این رزرو قبلاً لغو یا تکمیل شده است");
    }
    if (reservation.payment_status !== "SUCCESS") {
      await conn.rollback();
      throw new Error("پرداخت این رزرو تأیید نشده است");
    }
    if (Number(reservation.total_price) !== Number(refund.amount)) {
      await conn.rollback();
      throw new Error("مبلغ بازپرداخت با مبلغ رزرو مطابقت ندارد");
    }

    await conn.execute(
      `UPDATE refunds SET status = 'APPROVED', processed_by = ?, processed_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [adminId, refundId]
    );

    await conn.execute(
      `UPDATE reservations SET status = 'REFUND_PENDING', updated_at = NOW() WHERE id = ? AND status = 'CANCELLATION_REQUESTED'`,
      [refund.reservation_id]
    );

    await conn.commit();

    logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName,
      action: "REFUND_APPROVED",
      resource: "refund",
      resourceId: refundId,
      metadata: { reservationId: refund.reservation_id, amount: refund.amount },
    });

    return refund;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────── تایید واریز وجه ───────────────
async function confirmRefundPaid({ refundId, adminId, adminName, transactionRef }) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM refunds WHERE id = ? LIMIT 1 FOR UPDATE`,
      [refundId]
    );
    const refund = rows[0];
    if (!refund) {
      await conn.rollback();
      throw new Error("درخواست بازپرداخت یافت نشد");
    }
    if (refund.status !== "APPROVED") {
      await conn.rollback();
      throw new Error("این درخواست در وضعیت تایید شده نیست");
    }

    // اعتبارسنجی مجدد وضعیت رزرو
    const [resRows] = await conn.execute(
      `SELECT id, status, payment_status, total_price FROM reservations WHERE id = ? LIMIT 1`,
      [refund.reservation_id]
    );
    const reservation = resRows[0];
    if (!reservation) {
      await conn.rollback();
      throw new Error("رزرو مرتبط یافت نشد");
    }
    if (reservation.status === "CANCELLED" || reservation.status === "CHECKED_OUT") {
      await conn.rollback();
      throw new Error("این رزرو قبلاً لغو یا تکمیل شده است");
    }
    if (reservation.payment_status !== "SUCCESS") {
      await conn.rollback();
      throw new Error("پرداخت این رزرو تأیید نشده است");
    }
    if (Number(reservation.total_price) !== Number(refund.amount)) {
      await conn.rollback();
      throw new Error("مبلغ بازپرداخت با مبلغ رزرو مطابقت ندارد");
    }

    // ثبت تایید واریز
    await conn.execute(
      `UPDATE refunds SET status = 'PAID', processed_by = ?, processed_at = NOW(),
       transaction_ref = ?, updated_at = NOW() WHERE id = ?`,
      [adminId, transactionRef || null, refundId]
    );

    // به‌روزرسانی وضعیت رزرو به CANCELLED
    await conn.execute(
      `UPDATE reservations SET status = 'CANCELLED', updated_at = NOW() WHERE id = ? AND status = 'REFUND_PENDING'`,
      [refund.reservation_id]
    );

    await conn.commit();

    logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName,
      action: "REFUND_CONFIRMED_PAID",
      resource: "refund",
      resourceId: refundId,
      metadata: { reservationId: refund.reservation_id, amount: refund.amount, transactionRef },
    });

    return refund;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────── رد درخواست ───────────────
async function rejectRefund({ refundId, adminId, adminName, reason }) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM refunds WHERE id = ? LIMIT 1 FOR UPDATE`,
      [refundId]
    );
    const refund = rows[0];
    if (!refund) {
      await conn.rollback();
      throw new Error("درخواست بازپرداخت یافت نشد");
    }
    if (refund.status !== "PENDING") {
      await conn.rollback();
      throw new Error("فقط درخواست‌های در انتظار بررسی قابل رد هستند");
    }

    await conn.execute(
      `UPDATE refunds SET status = 'REJECTED', processed_by = ?, rejection_reason = ?, processed_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [adminId, reason || null, refundId]
    );

    // بازگشت وضعیت رزرو به CONFIRMED (چون قبلاً CANCELLATION_REQUESTED شده بود)
    await conn.execute(
      `UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = ? AND status = 'CANCELLATION_REQUESTED'`,
      [refund.reservation_id]
    );

    await conn.commit();

    logAudit({
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName,
      action: "REFUND_REJECTED",
      resource: "refund",
      resourceId: refundId,
      metadata: { reservationId: refund.reservation_id, reason },
    });

    // اعلان مشتری
    const [resRows] = await query(
      `SELECT customer_id, guest_name FROM reservations WHERE id = ? LIMIT 1`,
      [refund.reservation_id]
    );
    if (resRows[0] && resRows[0].customer_id) {
      createCustomerNotification({
        customerId: resRows[0].customer_id,
        type: "CANCELLATION_REJECTED",
        title: "درخواست لغو رد شد",
        message: `درخواست لغو رزرو شما رد شد. دلیل: ${reason || "بدون دلیل"}`,
        refType: "reservation",
        refId: refund.reservation_id,
      });
    }

    return refund;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────── لغو درخواست توسط مشتری ───────────────
async function cancelRefundRequest({ refundId, customerId }) {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT * FROM refunds WHERE id = ? AND requested_by = ? LIMIT 1 FOR UPDATE`,
      [refundId, customerId]
    );
    const refund = rows[0];
    if (!refund) {
      await conn.rollback();
      throw new Error("درخواست یافت نشد");
    }
    if (refund.status !== "PENDING") {
      await conn.rollback();
      throw new Error("فقط درخواست‌های در انتظار بررسی قابل لغو هستند");
    }

    await conn.execute(
      `UPDATE refunds SET status = 'CANCELLED', updated_at = NOW() WHERE id = ?`,
      [refundId]
    );

    // بازگشت وضعیت رزرو به CONFIRMED
    await conn.execute(
      `UPDATE reservations SET status = 'CONFIRMED', updated_at = NOW() WHERE id = ? AND status = 'CANCELLATION_REQUESTED'`,
      [refund.reservation_id]
    );

    await conn.commit();

    logAudit({
      actorType: "CUSTOMER",
      actorId: customerId,
      actorName: null,
      action: "CANCELLATION_REQUEST_CANCELLED",
      resource: "refund",
      resourceId: refundId,
      metadata: { reservationId: refund.reservation_id },
    });

    return refund;
  } catch (err) {
    try { await conn.rollback(); } catch {}
    throw err;
  } finally {
    conn.release();
  }
}

// ─────────────── ماسک کردن شماره کارت ───────────────
function maskCardNumber(cardNumber) {
  if (!cardNumber) return "";
  const digits = String(cardNumber).replace(/\D/g, "");
  if (digits.length < 4) return digits;
  return "****" + digits.slice(-4);
}

module.exports = {
  REFUND_STATUSES,
  REFUND_STATUS_LABELS,
  getRefundById,
  listRefunds,
  createRefundRequest,
  approveRefund,
  confirmRefundPaid,
  rejectRefund,
  cancelRefundRequest,
  maskCardNumber,
};
