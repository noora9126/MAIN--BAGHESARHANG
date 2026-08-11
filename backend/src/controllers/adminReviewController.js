const { query } = require("../config/db");
const { syncReviews } = require("../services/reviewSyncService");

// ─────────────── لیست نظرات ───────────────
const listReviews = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, source, source_url, author, rating, rating_label, title, content, stay_date, room_type, status, created_at
       FROM reviews
       ORDER BY created_at DESC`
    );
    const active = rows.filter((r) => r.status === "ACTIVE");
    const avg = active.length
      ? active.reduce((s, r) => s + Number(r.rating || 0), 0) / active.length
      : 0;
    res.json({
      success: true,
      reviews: rows,
      stats: {
        total: rows.length,
        active: active.length,
        avgRating: Math.round(avg * 10) / 10,
      },
    });
  } catch (err) {
    console.error("listReviews error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── همگام‌سازی واقعی با سایت‌های رزرو ───────────────
const syncReviewsHandler = async (req, res) => {
  try {
    // مشتری واقعاً منتظر می‌ماند تا نتیجه همگام‌سازی بیاید
    const result = await syncReviews(true);
    res.json({
      success: true,
      message: "همگام‌سازی نظرات انجام شد",
      result,
    });
  } catch (err) {
    console.error("syncReviews error:", err);
    res.status(500).json({ success: false, message: "خطا در همگام‌سازی نظرات" });
  }
};

// ─────────────── نمایش/مخفی کردن نظر ───────────────
const toggleReview = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reviews WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "نظر یافت نشد" });
    }
    const next = rows[0].status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    await query(`UPDATE reviews SET status = ? WHERE id = ?`, [next, id]);
    res.json({
      success: true,
      message: next === "ACTIVE" ? "نظر نمایش داده می‌شود" : "نظر مخفی شد",
      status: next,
    });
  } catch (err) {
    console.error("toggleReview error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── حذف نظر ───────────────
const deleteReview = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM reviews WHERE id = ? LIMIT 1`, [id]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "نظر یافت نشد" });
    }
    await query(`DELETE FROM reviews WHERE id = ?`, [id]);
    res.json({ success: true, message: "نظر حذف شد" });
  } catch (err) {
    console.error("deleteReview error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { listReviews, syncReviewsHandler, toggleReview, deleteReview };