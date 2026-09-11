const { query } = require("../config/db");
const bcrypt = require("bcryptjs");
const { logAudit, clientIp } = require("../services/auditLogService");
const { ROLE_PERMISSIONS, ROLE_LABELS } = require("../config/permissions");

const VALID_ROLES = ["SUPER_ADMIN", "ADMIN", "RECEPTIONIST", "MANAGER", "RESERVATION_MANAGER", "FINANCE_MANAGER", "SUPPORT_ADMIN", "VIEWER"];

// ─────────────── لیست کاربران ───────────────
const listUsers = async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, username, name, email, role, last_login, created_at FROM admin_users ORDER BY created_at DESC`
    );
    res.json({ success: true, users: rows });
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── جزئیات یک کاربر ───────────────
const getUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(
      `SELECT id, username, name, email, role, last_login, created_at FROM admin_users WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("getUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ساخت کاربر جدید ───────────────
const createUser = async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body || {};

    if (!username || !password || !role) {
      return res.status(400).json({ success: false, message: "نام کاربری، رمز عبور و نقش الزامی است" });
    }

    const cleanUsername = String(username).trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({ success: false, message: "نام کاربری باید بین ۳ تا ۵۰ کاراکتر باشد" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: "نقش وارد شده معتبر نیست" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد" });
    }

    const dup = await query(`SELECT id FROM admin_users WHERE username = ? LIMIT 1`, [cleanUsername]);
    if (dup[0]) {
      return res.status(409).json({ success: false, message: "این نام کاربری قبلاً استفاده شده است" });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const result = await query(
      `INSERT INTO admin_users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [
        cleanUsername,
        String(name || "").trim().slice(0, 100) || null,
        String(email || "").trim().slice(0, 100) || null,
        hash,
        role,
      ]
    );

    await logAudit({
      actorType: "ADMIN",
      actorId: req.admin.id,
      actorName: req.admin.username,
      action: "USER_CREATED",
      resource: "admin_user",
      resourceId: result.insertId,
      ip: clientIp(req),
      metadata: { username: cleanUsername, role },
    });

    const created = await query(
      `SELECT id, username, name, email, role, created_at FROM admin_users WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json({ success: true, message: "کاربر ایجاد شد", user: created[0] });
  } catch (err) {
    console.error("createUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── ویرایش کاربر ───────────────
const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    const { name, email, role, password } = req.body || {};
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(String(name).trim().slice(0, 100) || null);
    }
    if (email !== undefined) {
      updates.push("email = ?");
      params.push(String(email).trim().slice(0, 100) || null);
    }
    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: "نقش وارد شده معتبر نیست" });
      }

      // محافظت از تغییر نقش آخرین SUPER_ADMIN
      if (user.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
        const superAdminCount = await query(
          `SELECT COUNT(*) AS c FROM admin_users WHERE role = 'SUPER_ADMIN' AND id != ?`,
          [id]
        );
        if (superAdminCount[0].c === 0) {
          return res.status(403).json({
            success: false,
            message: "امکان تغییر نقش آخرین مدیر ارشد سیستم وجود ندارد",
          });
        }
      }

      // جلوگیری از ارتقای خود به SUPER_ADMIN
      if (role === "SUPER_ADMIN" && req.admin.role !== "SUPER_ADMIN") {
        return res.status(403).json({ success: false, message: "شما مجوز ارتقای نقش به مدیر ارشد را ندارید" });
      }

      // جلوگیری از تغییر نقش خود توسط غیر SUPER_ADMIN
      if (id === req.admin.id && req.admin.role !== "SUPER_ADMIN") {
        return res.status(403).json({ success: false, message: "فقط مدیر ارشد سیستم می‌تواند نقش خود را تغییر دهد" });
      }

      updates.push("role = ?");
      params.push(role);
    }

    if (password) {
      if (String(password).length < 8) {
        return res.status(400).json({ success: false, message: "رمز عبور باید حداقل ۸ کاراکتر باشد" });
      }
      const hash = await bcrypt.hash(String(password), 10);
      updates.push("password_hash = ?");
      params.push(hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: "موردی برای ویرایش وجود ندارد" });
    }

    params.push(id);
    await query(`UPDATE admin_users SET ${updates.join(", ")} WHERE id = ?`, params);

    await logAudit({
      actorType: "ADMIN",
      actorId: req.admin.id,
      actorName: req.admin.username,
      action: "USER_UPDATED",
      resource: "admin_user",
      resourceId: id,
      ip: clientIp(req),
      metadata: { targetUsername: user.username, changes: { name, email, role, password: password ? "[HIDDEN]" : undefined } },
    });

    const updated = await query(
      `SELECT id, username, name, email, role, last_login, created_at FROM admin_users WHERE id = ? LIMIT 1`,
      [id]
    );
    res.json({ success: true, message: "کاربر ویرایش شد", user: updated[0] });
  } catch (err) {
    console.error("updateUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── غیرفعال‌سازی کاربر ───────────────
const disableUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    // جلوگیری از غیرفعال‌سازی خود
    if (id === req.admin.id) {
      return res.status(403).json({ success: false, message: "امکان غیرفعال‌سازی حساب خود وجود ندارد" });
    }

    // جلوگیری از غیرفعال‌سازی آخرین SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      const superAdminCount = await query(
        `SELECT COUNT(*) AS c FROM admin_users WHERE role = 'SUPER_ADMIN' AND is_active = 1`
      );
      if (superAdminCount[0].c <= 1) {
        return res.status(403).json({
          success: false,
          message: "امکان غیرفعال‌سازی آخرین مدیر ارشد سیستم وجود ندارد",
        });
      }
    }

    await query(`UPDATE admin_users SET is_active = 0 WHERE id = ?`, [id]);

    await logAudit({
      actorType: "ADMIN",
      actorId: req.admin.id,
      actorName: req.admin.username,
      action: "USER_DISABLED",
      resource: "admin_user",
      resourceId: id,
      ip: clientIp(req),
      metadata: { targetUsername: user.username },
    });

    res.json({ success: true, message: "کاربر غیرفعال شد" });
  } catch (err) {
    console.error("disableUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── فعال‌سازی مجدد کاربر ───────────────
const enableUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    await query(`UPDATE admin_users SET is_active = 1 WHERE id = ?`, [id]);

    await logAudit({
      actorType: "ADMIN",
      actorId: req.admin.id,
      actorName: req.admin.username,
      action: "USER_ENABLED",
      resource: "admin_user",
      resourceId: id,
      ip: clientIp(req),
      metadata: { targetUsername: user.username },
    });

    res.json({ success: true, message: "کاربر فعال شد" });
  } catch (err) {
    console.error("enableUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── حذف کاربر ───────────────
const deleteUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: "کاربر یافت نشد" });
    }

    // جلوگیری از حذف خود
    if (id === req.admin.id) {
      return res.status(403).json({ success: false, message: "امکان حذف حساب خود وجود ندارد" });
    }

    // جلوگیری از حذف آخرین SUPER_ADMIN
    if (user.role === "SUPER_ADMIN") {
      const superAdminCount = await query(
        `SELECT COUNT(*) AS c FROM admin_users WHERE role = 'SUPER_ADMIN'`
      );
      if (superAdminCount[0].c <= 1) {
        return res.status(403).json({
          success: false,
          message: "امکان حذف آخرین مدیر ارشد سیستم وجود ندارد",
        });
      }
    }

    await query(`DELETE FROM admin_users WHERE id = ?`, [id]);

    await logAudit({
      actorType: "ADMIN",
      actorId: req.admin.id,
      actorName: req.admin.username,
      action: "USER_DELETED",
      resource: "admin_user",
      resourceId: id,
      ip: clientIp(req),
      metadata: { targetUsername: user.username, targetRole: user.role },
    });

    res.json({ success: true, message: "کاربر حذف شد" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── دریافت دسترسی‌های نقش‌ها ───────────────
const getRoles = async (req, res) => {
  try {
    const roles = Object.keys(ROLE_PERMISSIONS).map((role) => ({
      name: role,
      label: ROLE_LABELS[role] || role,
      permissions: ROLE_PERMISSIONS[role],
    }));
    res.json({ success: true, roles });
  } catch (err) {
    console.error("getRoles error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── دریافت دسترسی‌های کاربر جاری ───────────────
const getMyPermissions = async (req, res) => {
  try {
    const perms = ROLE_PERMISSIONS[req.admin.role] || [];
    res.json({ success: true, role: req.admin.role, permissions: perms });
  } catch (err) {
    console.error("getMyPermissions error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  deleteUser,
  getRoles,
  getMyPermissions,
};
