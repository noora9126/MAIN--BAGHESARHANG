const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const roomRoutes = require("./routes/roomRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const customerRoutes = require("./routes/customerRoutes");
const userManagementRoutes = require("./routes/userManagementRoutes");

const app = express();

const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5174"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
      callback(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({
  // نگهداری RAW BODY برای اعتبارسنجی امضای HMAC-SHA256 وب‌هوک واریزا
  verify: (req, res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
}));

app.get("/", (req, res) => {
  res.json({ success: true, name: "هتل باغ سرهنگ API", version: "2.0" });
});

app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api/customer", customerRoutes);

// مدیریت خطاهای عمومی
app.use((req, res) => {
  res.status(404).json({ success: false, message: "مسیر یافت نشد" });
});

app.use((err, req, res, next) => {
  // خطاهای parser (مثل JSON خراب) کد وضعیت مشخص دارند
  const code = Number(err?.statusCode || err?.status || 0);
  if (code >= 400 && code < 500) {
    return res.status(code).json({ success: false, message: "درخواست نامعتبر است" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "متأسفانه مشکلی پیش آمد؛ لطفاً دوباره تلاش کنید" });
});

module.exports = app;
