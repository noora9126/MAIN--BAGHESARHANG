const { query } = require("../config/db");

// ─────────────── ثبت رویدادهای حساس (Audit Log) ───────────────
// اطلاعات حساس (رمز عبور، OTP خام و …) هرگز در این لاگ ذخیره نمی‌شود.
async function logAudit({ actorType, actorId = null, actorName = null, action, resource = null, resourceId = null, ip = null, metadata = null }) {
  try {
    await query(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, resource, resource_id, ip, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actorType,
        actorId,
        actorName ? String(actorName).slice(0, 100) : null,
        String(action).slice(0, 100),
        resource ? String(resource).slice(0, 100) : null,
        resourceId || null,
        ip ? String(ip).slice(0, 45) : null,
        metadata ? JSON.stringify(metadata).slice(0, 2000) : null,
      ]
    );
  } catch (err) {
    console.error("logAudit error:", err.message);
  }
}

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || null;
}

module.exports = { logAudit, clientIp };
