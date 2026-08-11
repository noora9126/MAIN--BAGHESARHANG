const { query } = require("../config/db");

// ─────────────── لیست اعلان‌ها ───────────────
const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const rows = await query(
      `SELECT id, type, title, message, ref_type, ref_id, is_read, created_at
       FROM notifications
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
      [limit]
    );
    const unread = await query(`SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0`);
    res.json({
      success: true,
      notifications: rows,
      unreadCount: unread[0].total,
    });
  } catch (err) {
    console.error("listNotifications error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── علامت‌گذاری یک اعلان به عنوان خوانده‌شده ───────────────
const markRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    const unread = await query(`SELECT COUNT(*) AS total FROM notifications WHERE is_read = 0`);
    res.json({ success: true, unreadCount: unread[0].total });
  } catch (err) {
    console.error("markRead error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── علامت‌گذاری همه اعلان‌ها ───────────────
const markAllRead = async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
    res.json({ success: true, unreadCount: 0 });
  } catch (err) {
    console.error("markAllRead error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { listNotifications, markRead, markAllRead };
