const { query } = require("../config/db");
const {
  listRefunds,
  getRefundById,
  approveRefund,
  confirmRefundPaid,
  rejectRefund,
  maskCardNumber,
  REFUND_STATUS_LABELS,
} = require("../services/refundService");
const { createCustomerNotification } = require("../services/notificationService");
const { sendSms } = require("../services/smsService");
const { formatPriceToman } = require("../utils/helpers");

// ─────────────── لیست درخواست‌های بازپرداخت ───────────────
const listRefundRequests = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const result = await listRefunds({ status, search, page, limit });

    // ماسک کردن شماره کارت برای پاسخ
    const refunds = result.refunds.map((r) => ({
      ...r,
      refund_card_number_masked: maskCardNumber(r.refund_card_number),
      status_label: REFUND_STATUS_LABELS[r.status] || r.status,
    }));

    res.json({
      success: true,
      refunds,
      total: result.total,
      page: result.page,
      pages: result.pages,
    });
  } catch (err) {
    console.error("listRefundRequests error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── جزئیات درخواست بازپرداخت ───────────────
const getRefundRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
    }

    const refund = await getRefundById(id);
    if (!refund) {
      return res.status(404).json({ success: false, message: "درخواست یافت نشد" });
    }

    res.json({
      success: true,
      refund: {
        ...refund,
        refund_card_number_masked: maskCardNumber(refund.refund_card_number),
        status_label: REFUND_STATUS_LABELS[refund.status] || refund.status,
      },
    });
  } catch (err) {
    console.error("getRefundRequest error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── تایید و پردازش درخواست ───────────────
const processRefundRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
    }

    const refund = await approveRefund({
      refundId: id,
      adminId: req.admin.id,
      adminName: req.admin.name || req.admin.username,
    });

    res.json({ success: true, message: "درخواست تایید شد", refundId: refund.id });
  } catch (err) {
    console.error("processRefundRequest error:", err);
    if (err.message.includes("یافت نشد") || err.message.includes("پردازش شده")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── تایید واریز وجه ───────────────
const confirmRefundPayment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
    }

    const { transactionRef } = req.body || {};

    const refund = await confirmRefundPaid({
      refundId: id,
      adminId: req.admin.id,
      adminName: req.admin.name || req.admin.username,
      transactionRef: transactionRef || null,
    });

    // دریافت اطلاعات رزرو برای اعلان مشتری
    const [resRows] = await query(
      `SELECT customer_id, guest_name, guest_phone, reservation_number, room_name
       FROM reservations WHERE id = ? LIMIT 1`,
      [refund.reservation_id]
    );

    if (resRows[0]) {
      const reservation = resRows[0];

      // اعلان مشتری
      if (reservation.customer_id) {
        createCustomerNotification({
          customerId: reservation.customer_id,
          type: "REFUND_COMPLETED",
          title: "بازپرداخت انجام شد",
          message: `رزرو شما با موفقیت لغو شد و مبلغ ${formatPriceToman(refund.amount)} به کارت ثبت‌شده شما واریز شد.`,
          refType: "reservation",
          refId: refund.reservation_id,
        });
      }

      // پیامک مشتری
      if (reservation.guest_phone) {
        try {
          await sendSms(
            reservation.guest_phone,
            `بازپرداخت رزرو ${reservation.reservation_number}\nمبلغ: ${formatPriceToman(refund.amount)}\nوضعیت: واریز انجام شد\nاز انتخاب هتل باغ سرهنگ سپاسگزاریم`,
            { type: "REFUND_COMPLETED", reservationId: refund.reservation_id }
          );
        } catch (smsErr) {
          console.error("Failed to send refund SMS:", smsErr);
        }
      }
    }

    res.json({ success: true, message: "واریز تایید شد", refundId: refund.id });
  } catch (err) {
    console.error("confirmRefundPayment error:", err);
    if (err.message.includes("یافت نشد") || err.message.includes("وضعیت")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── رد درخواست ───────────────
const rejectRefundRequest = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
    }

    const { reason } = req.body || {};
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ success: false, message: "دلیل رد الزامی است" });
    }

    const refund = await rejectRefund({
      refundId: id,
      adminId: req.admin.id,
      adminName: req.admin.name || req.admin.username,
      reason: String(reason).trim().slice(0, 1000),
    });

    // ارسال پیامک اطلاع‌رسانی رد به مشتری
    const [resRows] = await query(
      `SELECT guest_phone, reservation_number FROM reservations WHERE id = ? LIMIT 1`,
      [refund.reservation_id]
    );
    if (resRows[0] && resRows[0].guest_phone) {
      try {
        await sendSms(
          resRows[0].guest_phone,
          `درخواست لغو رزرو ${resRows[0].reservation_number} رد شد.\nدلیل: ${String(reason).trim().slice(0, 100)}\nهتل باغ سرهنگ`,
          { type: "CANCELLATION_REJECTED", reservationId: refund.reservation_id }
        );
      } catch (smsErr) {
        console.error("Failed to send rejection SMS:", smsErr);
      }
    }

    res.json({ success: true, message: "درخواست رد شد", refundId: refund.id });
  } catch (err) {
    console.error("rejectRefundRequest error:", err);
    if (err.message.includes("یافت نشد") || err.message.includes("وضعیت")) {
      return res.status(400).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── اطلاعات شماره کارت بازپرداخت (فقط ادمین مجاز) ───────────────
const getRefundCardDetails = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: "شناسه نامعتبر است" });
    }

    const refund = await getRefundById(id);
    if (!refund) {
      return res.status(404).json({ success: false, message: "درخواست یافت نشد" });
    }

    res.json({
      success: true,
      cardDetails: {
        refund_card_number: refund.refund_card_number || null,
        refund_card_holder_name: refund.refund_card_holder_name || null,
      },
    });
  } catch (err) {
    console.error("getRefundCardDetails error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = {
  listRefundRequests,
  getRefundRequest,
  processRefundRequest,
  confirmRefundPayment,
  rejectRefundRequest,
  getRefundCardDetails,
};
