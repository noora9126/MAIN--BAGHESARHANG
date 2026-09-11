// تست یکپارچه جریان مشتری + کنترل دسترسی رزرو
// اجرا: NODE_ENV=development SMS_SIMULATE=1 node database/test-customer.js
process.env.PORT = 5098;
const app = require("../src/app");
require("../src/config/db");

const BASE = "http://localhost:5098";
let server;

async function call(method, path, body, token) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function cleanup(mobile) {
  const { query } = require("../src/config/db");
  await query(`DELETE FROM phone_verifications WHERE phone = ?`, [mobile]);
  await query(`DELETE FROM customers WHERE mobile = ?`, [mobile]);
}

function futureDates() {
  const f = new Date(Date.now() + 10 * 86400000);
  const ci = f.toISOString().slice(0, 10);
  const co = new Date(f.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  return { ci, co };
}

async function main() {
  server = app.listen(process.env.PORT);
  const mobile = "09370000002";
  await cleanup(mobile);
  const { ci, co } = futureDates();

  console.log("=== 1. ثبت‌نام ===");
  let r = await call("POST", "/api/customer/auth/register", {
    fullName: "محمد آزمایشی",
    mobile,
    password: "Test1234",
  });
  console.log("status:", r.status, r.status === 201 ? "OK" : "FAIL", "sessionId:", !!r.data.sessionId);
  const sessionId = r.data.sessionId;
  const devCode = r.data.devCode;

  console.log("=== 2. تایید کد ثبت‌نام ===");
  r = await call("POST", "/api/customer/auth/register/verify", { sessionId, code: devCode });
  console.log("status:", r.status, r.status === 200 ? "OK" : "FAIL", "token:", !!r.data.token);
  const token = r.data.token;

  console.log("=== 3. رزرو بدون توکن (باید 401 شود) ===");
  r = await call("POST", "/api/reservations", {
    roomId: 5, checkIn: ci, checkOut: co, numberOfAdults: 2, numberOfChildren: 0, childAges: [],
    guests: [{ name: "محمد آزمایشی", nationalId: "1000000001" }],
    guestName: "محمد آزمایشی", guestEmail: "t@example.com", nationalId: "1000000001",
  });
  console.log("status:", r.status, r.status === 401 ? "OK (blocked)" : "FAIL (not blocked!)");

  console.log("=== 4. رزرو با توکن مشتری (باید 201 شود) ===");
  r = await call("POST", "/api/reservations", {
    roomId: 5, checkIn: ci, checkOut: co, numberOfAdults: 2, numberOfChildren: 0, childAges: [],
    guests: [{ name: "محمد آزمایشی", nationalId: "1000000001" }],
    guestName: "محمد آزمایشی", guestEmail: "t@example.com", nationalId: "1000000001",
  }, token);
  console.log("status:", r.status, r.status === 201 ? "OK" : "FAIL", "res:", r.data.reservation?.reservation_number || r.data.message);

  console.log("=== 5. ورود با رمز درست ===");
  r = await call("POST", "/api/customer/auth/login", { mobile, password: "Test1234" });
  console.log("status:", r.status, r.status === 200 && r.data.token ? "OK" : "FAIL");

  console.log("=== 6. ورود با رمز غلط ===");
  r = await call("POST", "/api/customer/auth/login", { mobile, password: "Wrong1234" });
  console.log("status:", r.status, r.status === 401 ? "OK" : "FAIL", "msg:", r.data.message);

  await cleanup(mobile);
  console.log("🎉 تست تمام شد");
}

main()
  .catch((err) => console.error("❌ خطا:", err))
  .finally(() => {
    server.close();
    process.exit(0);
  });
