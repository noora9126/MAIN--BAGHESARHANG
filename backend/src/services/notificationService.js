const { query } = require("../config/db");

// ─────────────── ثبت اعلان داخلی داشبورد ───────────────
const createNotification = async ({ type, title, message, refType = null, refId = null }) => {
  try {
    const result = await query(
      `INSERT INTO notifications (type, title, message, ref_type, ref_id, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [type, title, message, refType, refId]
    );
    return result.insertId;
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
};

module.exports = { createNotification };
