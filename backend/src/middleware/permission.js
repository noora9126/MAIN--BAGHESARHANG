const { roleHasPermission } = require("../config/permissions");

// بررسی دسترسی نقش ادمین — باید بعد از authAdmin استفاده شود
function requirePermission(permission) {
  return (req, res, next) => {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ success: false, message: "احراز هویت انجام نشده است" });
    }
    if (!roleHasPermission(admin.role, permission)) {
      return res.status(403).json({ success: false, message: "شما مجوز انجام این عملیات را ندارید" });
    }
    next();
  };
}

// بررسی چند دسترسی (یکی از آن‌ها کافی است)
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ success: false, message: "احراز هویت انجام نشده است" });
    }
    if (!permissions.some((p) => roleHasPermission(admin.role, p))) {
      return res.status(403).json({ success: false, message: "شما مجوز انجام این عملیات را ندارید" });
    }
    next();
  };
}

module.exports = { requirePermission, requireAnyPermission };
