const { query } = require("../config/db");
const { sendSms } = require("../services/smsService");

// ─────────────── لیست مهمانان (تجمیعی از رزروها) ───────────────
const listGuests = async (req, res) => {
  try {
    const { search, sort = "-lastReservation", page = 1, limit = 20 } = req.query;

    const conditions = [`r.guest_phone <> ''`];
    const params = [];
    if (search) {
      conditions.push("(r.guest_phone LIKE ? OR r.guest_name LIKE ?)");
      const like = `%${String(search).trim()}%`;
      params.push(like, like);
    }
    const where = `WHERE ${conditions.join(" AND ")}`;

    const sortCol = {
      name: "MAX(r.guest_name)",
      phone: "r.guest_phone",
      lastReservation: "MAX(r.created_at)",
      totalBookings: "COUNT(*)",
    }[String(sort).replace(/^-/, "")] || "MAX(r.created_at)";
    const sortDir = String(sort).startsWith("-") ? "DESC" : "ASC";

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    const countRows = await query(`SELECT COUNT(DISTINCT r.guest_phone) AS total FROM reservations r ${where}`, params);
    const rows = await query(
      `SELECT r.guest_phone AS phone,
              MAX(r.guest_name) AS name,
              MAX(r.guest_email) AS email,
              COUNT(*) AS totalBookings,
              MAX(r.created_at) AS lastReservation,
              SUM(CASE WHEN r.payment_status = 'SUCCESS' THEN r.total_price ELSE 0 END) AS totalSpent
       FROM reservations r
       ${where}
       GROUP BY r.guest_phone
       ORDER BY ${sortCol} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // پیوستن یادداشت‌های مهمان
    const notesRows = await query(`SELECT phone, notes FROM guest_notes`);
    const notesMap = {};
    for (const n of notesRows) notesMap[n.phone] = n.notes;

    const guests = rows.map((g) => ({ ...g, notes: notesMap[g.phone] || "" }));

    res.json({
      success: true,
      guests,
      total: countRows[0].total,
      page: pageNum,
      pages: Math.ceil(countRows[0].total / limitNum),
    });
  } catch (err) {
    console.error("listGuests error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── جزئیات مهمان + تاریخچه رزروها ───────────────
const getGuest = async (req, res) => {
  try {
    const phone = req.params.phone;
    const reservations = await query(
      `SELECT r.*, rm.image AS room_image
       FROM reservations r
       LEFT JOIN rooms rm ON rm.id = r.room_id
       WHERE r.guest_phone = ?
       ORDER BY r.created_at DESC`,
      [phone]
    );

    if (reservations.length === 0) {
      return res.status(404).json({ success: false, message: "مهمانی با این شماره یافت نشد" });
    }

    const notesRows = await query(`SELECT notes FROM guest_notes WHERE phone = ?`, [phone]);
    const notes = notesRows[0]?.notes || "";

    res.json({
      success: true,
      guest: {
        phone,
        name: reservations[0].guest_name,
        email: reservations[0].guest_email,
        totalBookings: reservations.length,
        lastReservation: reservations[0].created_at,
        notes,
      },
      reservations,
    });
  } catch (err) {
    console.error("getGuest error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── افزودن/ویرایش یادداشت مهمان ───────────────
const updateGuestNotes = async (req, res) => {
  try {
    const phone = req.params.phone;
    const notes = String(req.body.notes || "").slice(0, 2000);

    await query(
      `INSERT INTO guest_notes (phone, notes, updated_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE notes = VALUES(notes), updated_at = NOW()`,
      [phone, notes]
    );

    res.json({ success: true, message: "یادداشت ذخیره شد" });
  } catch (err) {
    console.error("updateGuestNotes error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ارسال پیامک به مهمان ───────────────
const sendGuestSms = async (req, res) => {
  try {
    const phone = req.params.phone;
    const message = String(req.body.message || "").trim();
    if (!message) {
      return res.status(400).json({ success: false, message: "متن پیامک الزامی است" });
    }

    const result = await sendSms(phone, message, { type: "GUEST_CUSTOM" });
    if (!result.success) {
      return res.status(502).json({ success: false, message: "ارسال پیامک ناموفق بود" });
    }

    res.json({ success: true, message: "پیامک ارسال شد", simulated: Boolean(result.simulated) });
  } catch (err) {
    console.error("sendGuestSms error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { listGuests, getGuest, updateGuestNotes, sendGuestSms };
