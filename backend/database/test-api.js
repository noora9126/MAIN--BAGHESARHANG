// تست سریع کل بک‌اند (اجرا: node database/test-api.js)
process.env.PORT = 5099;
const app = require("../src/app");
require("../src/config/db");

const BASE = "http://localhost:5099";
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

async function main() {
  server = app.listen(process.env.PORT);
  console.log("🔄 سرور تست روشن شد");

  // 1. روم‌ها
  let r = await call("GET", "/api/rooms");
  console.log("1. rooms:", r.data.success, "count:", r.data.rooms?.length);

  // 2. ساخت رزرو
  const future = new Date(Date.now() + 10 * 86400000);
  const ci = future.toISOString().slice(0, 10);
  const co = new Date(future.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  r = await call("POST", "/api/reservations", {
    roomId: 5, checkIn: ci, checkOut: co, numberOfGuests: 2,
    guestName: "Test Guest", guestEmail: "t@t.com", specialRequests: "",
  });
  console.log("2. create:", r.status, r.data.success, r.data.reservation?.reservationNumber, r.data.message || "");
  const rid = r.data.reservation?.id;
  if (!rid) { console.log("⛔ متوقف شد"); return; }

  // 3. رزرو تکراری باید 409 شود
  r = await call("POST", "/api/reservations", {
    roomId: 5, checkIn: ci, checkOut: co, numberOfGuests: 2,
    guestName: "Test Guest", guestEmail: "t@t.com",
  });
  console.log("3. duplicate conflict:", r.status, r.data.message || "");

  // 4. تایید شماره
  r = await call("POST", "/api/reservations/verify-phone", { phone: "09121234567" });
  console.log("4. verify-phone:", r.status, r.data.success, "devCode:", r.data.devCode || "-");
  const sessionId = r.data.sessionId;

  // 5. تایید کد
  r = await call("POST", "/api/reservations/verify-code", { sessionId, code: r.data.devCode || "000000" });
  console.log("5. verify-code:", r.status, r.data.success, r.data.verified);

  // 6. کد اشتباه
  r = await call("POST", "/api/reservations/verify-code", { sessionId, code: "111111" });
  console.log("6. wrong code:", r.status, r.data.success, r.data.attemptsLeft !== undefined ? `attemptsLeft=${r.data.attemptsLeft}` : r.data.message);

  // 7. اتصال شماره
  r = await call("POST", "/api/reservations/attach-phone", { reservationId: rid, phone: "09121234567" });
  console.log("7. attach:", r.status, r.data.success, r.data.message || "");

  // 8. پرداخت دستی (بدون زرین‌پال)
  r = await call("POST", "/api/payments/manual-confirm", { reservationId: rid });
  console.log("8. manual pay:", r.status, r.data.success, r.data.message || "");

  // 9. جزئیات رزرو
  r = await call("GET", `/api/reservations/${rid}`);
  console.log("9. detail:", r.status, r.data.reservation?.status, r.data.reservation?.payment_status, r.data.reservation?.sms_status);

  // 10. لاگین ادمین
  r = await call("POST", "/api/admin/login", { username: "admin", password: "admin123" });
  console.log("10. login:", r.status, r.data.success, "token:", r.data.token ? "YES" : "NO");
  const token = r.data.token;

  // 11. لاگین اشتباه
  r = await call("POST", "/api/admin/login", { username: "admin", password: "wrong" });
  console.log("11. bad login:", r.status, r.data.success, r.data.message || "");

  // 12. من
  r = await call("GET", "/api/admin/me", null, token);
  console.log("12. me:", r.status, r.data.admin?.username);

  // 13. رزروهای ادمین
  r = await call("GET", "/api/admin/reservations?status=CONFIRMED", null, token);
  console.log("13. admin reservations:", r.status, "total:", r.data.total);

  // 14. داشبورد
  r = await call("GET", "/api/admin/analytics/dashboard", null, token);
  console.log("14. dashboard:", r.status, "monthlyRev:", r.data.data?.monthlyRevenue, "occ:", r.data.data?.occupancy + "%", "trend:", r.data.data?.trend?.length);

  // 15. درآمد
  r = await call("GET", "/api/admin/analytics/revenue?groupBy=month", null, token);
  console.log("15. revenue:", r.status, "points:", r.data.data?.length);

  // 16. اشغال
  const from = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  r = await call("GET", `/api/admin/analytics/occupancy?from=${from}&to=${to}`, null, token);
  console.log("16. occupancy:", r.status, "days:", r.data.data?.length);

  // 17. اتاق‌ها
  r = await call("GET", "/api/admin/analytics/rooms", null, token);
  console.log("17. rooms perf:", r.status, "rooms:", r.data.rooms?.length);

  // 18. مهمانان
  r = await call("GET", "/api/admin/guests", null, token);
  console.log("18. guests:", r.status, "total:", r.data.total, "first:", r.data.guests?.[0]?.name);

  // 19. جزئیات مهمان
  r = await call("GET", "/api/admin/guests/09121234567", null, token);
  console.log("19. guest detail:", r.status, "bookings:", r.data.guest?.totalBookings);

  // 20. تنظیمات
  r = await call("GET", "/api/admin/settings", null, token);
  console.log("20. settings:", r.status, "hotel_phone:", r.data.settings?.hotel_phone);

  // 21. ویرایش اتاق
  r = await call("PUT", "/api/admin/rooms/5", { pricePerNight: 950000 }, token);
  console.log("21. update room:", r.status, r.data.success, "new price:", r.data.room?.pricePerNight);

  // 22. چک‌این
  r = await call("POST", `/api/admin/reservations/${rid}/check-in`, {}, token);
  console.log("22. check-in:", r.status, r.data.message || "");

  // 23. تغییر رمز (بازگرداندن)
  r = await call("POST", "/api/admin/change-password", { currentPassword: "admin123", newPassword: "admin123" }, token);
  console.log("23. change password:", r.status, r.data.success);

  // 24. بدون توکن
  r = await call("GET", "/api/admin/me");
  console.log("24. no token:", r.status, r.data.success === false);

  console.log("🎉 تست کامل شد");
}

main()
  .catch((err) => { console.error("❌", err.message); })
  .finally(() => { process.exit(0); });
