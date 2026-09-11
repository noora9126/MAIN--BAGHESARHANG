const jwt = require("jsonwebtoken");

// اعتبارسنجی توکن ادمین
function authAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "توکن وارد نشده است" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // توکن مشتری را روی مسیر ادمین قبول نکن
    if (decoded.type === "customer" || decoded.type === "reset") {
      return res.status(401).json({ success: false, message: "توکن نامعتبر است" });
    }
    req.admin = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "توکن نامعتبر یا منقضی شده است" });
  }
}

// اعتبارسنجی توکن مشتری
function authCustomer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "برای این عملیات ابتدا وارد حساب خود شوید" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "customer") {
      return res.status(401).json({ success: false, message: "توکن نامعتبر است" });
    }
    req.customer = { id: decoded.id, mobile: decoded.mobile, name: decoded.name };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "نشست شما منقضی شده است؛ دوباره وارد شوید" });
  }
}

// اعتبارسنجی توکن بازنشانی رمز عبور
function authResetToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: "دسترسی بازنشانی نامعتبر است" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "reset" || !decoded.mobile) {
      return res.status(401).json({ success: false, message: "درخواست بازنشانی نامعتبر است" });
    }
    req.reset = { mobile: decoded.mobile };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "زمان بازنشانی رمز منقضی شده؛ دوباره درخواست دهید" });
  }
}

module.exports = { authAdmin, authCustomer, authResetToken };
