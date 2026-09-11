const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { logAudit, clientIp } = require("../services/auditLogService");

function adminToken(admin) {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role, name: admin.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "24h" }
  );
}

function customerToken(customer) {
  return jwt.sign(
    { type: "customer", id: customer.id, mobile: customer.mobile, name: customer.full_name, username: customer.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRE || "7d" }
  );
}

function publicCustomer(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    mobile: row.mobile,
    email: row.email,
    national_code: row.national_code,
    username: row.username || null,
    created_at: row.created_at,
  };
}

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: "نام کاربری و رمز عبور الزامی است" });
    }

    const trimmed = String(identifier).trim();

    // ── اول جستجو در ادمین‌ها ──
    const adminRows = await query(`SELECT * FROM admin_users WHERE username = ? LIMIT 1`, [trimmed]);
    const admin = adminRows[0];

    if (admin) {
      if (await bcrypt.compare(String(password), admin.password_hash)) {
        await query(`UPDATE admin_users SET last_login = NOW() WHERE id = ?`, [admin.id]);

        await logAudit({
          actorType: "ADMIN",
          actorId: admin.id,
          actorName: admin.username,
          action: "ADMIN_LOGIN",
          resource: "admin",
          resourceId: admin.id,
          ip: clientIp(req),
        });

        return res.json({
          success: true,
          type: "admin",
          message: "ورود موفق",
          token: adminToken(admin),
          admin: { id: admin.id, username: admin.username, name: admin.name, email: admin.email, role: admin.role },
        });
      }
      // رمز اشتباه → همچنان بررسی مشتری نکن، چون username ادمین پیدا شد
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }

    // ── جستجو در مشتریان ──
    let customerRows;
    if (/^09\d{9}$/.test(trimmed)) {
      customerRows = await query(`SELECT * FROM customers WHERE mobile = ? LIMIT 1`, [trimmed]);
    } else {
      customerRows = await query(`SELECT * FROM customers WHERE username = ? LIMIT 1`, [trimmed]);
    }

    const customer = customerRows[0];
    if (!customer || !customer.password_hash) {
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }

    if (!(await bcrypt.compare(String(password), customer.password_hash))) {
      await logAudit({
        actorType: "CUSTOMER",
        actorId: customer.id,
        actorName: customer.mobile,
        action: "CUSTOMER_LOGIN_FAILED",
        resource: "customer",
        resourceId: customer.id,
        ip: clientIp(req),
      });
      return res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }

    if (!customer.is_active) {
      return res.status(403).json({ success: false, message: "حساب شما تأیید نشده است؛ ابتدا ثبت‌نام کنید" });
    }

    await query(`UPDATE customers SET last_login = NOW() WHERE id = ?`, [customer.id]);

    await logAudit({
      actorType: "CUSTOMER",
      actorId: customer.id,
      actorName: customer.mobile,
      action: "CUSTOMER_LOGIN",
      resource: "customer",
      resourceId: customer.id,
      ip: clientIp(req),
    });

    return res.json({
      success: true,
      type: "customer",
      message: "ورود موفق",
      token: customerToken(customer),
      customer: publicCustomer(customer),
    });
  } catch (err) {
    console.error("unified login error:", err);
    res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
  }
};

module.exports = { login };
