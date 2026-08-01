const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");

// ─────────────── ورود ادمین ───────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "نام کاربری و رمز عبور الزامی است" });
    }

    const rows = await query(`SELECT * FROM admin_users WHERE username = ? LIMIT 1`, [username.trim()]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(String(password), admin.password_hash))) {
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }

    await query(`UPDATE admin_users SET last_login = NOW() WHERE id = ?`, [admin.id]);

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "24h" }
    );

    res.json({
      success: true,
      message: "ورود موفق",
      token,
      admin: { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("admin login error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── اطلاعات ادمین ───────────────
const me = async (req, res) => {
  try {
    const rows = await query(`SELECT id, username, name, email, role, last_login FROM admin_users WHERE id = ? LIMIT 1`, [
      req.admin.id,
    ]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "ادمین یافت نشد" });
    }
    res.json({ success: true, admin: rows[0] });
  } catch (err) {
    console.error("admin me error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── تغییر رمز عبور ───────────────
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "رمز فعلی و رمز جدید الزامی است" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "رمز جدید حداقل 6 کاراکتر باشد" });
    }

    const rows = await query(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [req.admin.id]);
    const admin = rows[0];
    if (!admin || !(await bcrypt.compare(String(currentPassword), admin.password_hash))) {
      return res.status(400).json({ success: false, message: "رمز عبور فعلی اشتباه است" });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await query(`UPDATE admin_users SET password_hash = ? WHERE id = ?`, [hash, req.admin.id]);

    res.json({ success: true, message: "رمز عبور با موفقیت تغییر کرد" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = { login, me, changePassword };
