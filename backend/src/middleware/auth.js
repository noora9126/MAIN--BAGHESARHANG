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
    req.admin = { id: decoded.id, username: decoded.username, role: decoded.role, name: decoded.name };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "توکن نامعتبر یا منقضی شده است" });
  }
}

module.exports = { authAdmin };
