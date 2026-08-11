require("dotenv").config();
const jwt = require("jsonwebtoken");
const API = "http://localhost:5000";

const token = jwt.sign(
  { id: 1, username: "amiraliriazi_hotel_manager", role: "SUPER_ADMIN" },
  process.env.JWT_SECRET,
  { expiresIn: "30d" }
);

const adminH = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
const pubH = { "Content-Type": "application/json" };

// تولید کد ملی ۱۰ رقمی معتبر
function validNationalId() {
  for (let i = 0; i < 10000; i++) {
    let c = String(Math.floor(Math.random() * 900000000) + 100000000);
    const digits = c.split("").map(Number);
    let sum = 0;
    for (let j = 0; j < 9; j++) sum += digits[j] * (10 - j);
    const rem = sum % 11;
    const check = rem < 2 ? rem : 11 - rem;
    c += check;
    if (/^[1-9]\d{9}$/.test(c) && String(c[9]) === String(check)) return c;
  }
}

async function jpost(url, body, h) {
  const r = await fetch(API + url, { method: "POST", headers: h, body: JSON.stringify(body) });
  const d = await r.json();
  return { status: r.status, d };
}
async function jget(url, h) {
  const r = await fetch(API + url, { headers: h });
  return r.json();
}

(async () => {
  const before = await jget("/api/admin/notifications", adminH);
  console.log("NOTIFS before:", before.notifications.length, "unread:", before.unreadCount);

  // 0) ساخت کد تخفیف واقعی برای تست (بعداً پاک می‌شود)
  const code = "TEST" + Math.floor(Math.random() * 10000);
  const created = await jpost("/api/admin/discounts", { code, discountPercent: 10, reason: "تست سیستم" }, adminH);
  console.log("DISCOUNT created:", created.d.discount ? created.d.discount.code : created.d.message);

  // 1) رزرو واقعی با کد تخفیف
  const res = await jpost(
    "/api/reservations",
    {
      roomId: 5,
      checkIn: "2026-09-10",
      checkOut: "2026-09-12",
      numberOfAdults: 1,
      numberOfChildren: 0,
      childAges: [],
      guests: [],
      guestName: "علی محمدی",
      guestEmail: "ali.test@example.com",
      nationalId: validNationalId(),
      discountCode: code,
    },
    pubH
  );
  if (res.status !== 201) return console.log("RESERVE FAILED:", res.status, res.d.message);
  const r = res.d.reservation;
  console.log("CREATED:", r.reservation_number, "total:", r.total_price, "discount:", r.discount_code, r.discount_percent + "%", r.discount_amount);

  // 2) تایید پرداخت (دستی)
  const pay = await jpost("/api/payments/manual-confirm", { reservationId: r.id }, pubH);
  console.log("PAY:", pay.d.success, pay.d.message);

  // 3) اعلان‌ها بعد از رزرو + پرداخت
  const after = await jget("/api/admin/notifications?limit=10", adminH);
  console.log("NOTIFS after:", after.notifications.length);
  after.notifications.slice(0, 3).forEach((n) => console.log("  -", n.type, "|", n.title));

  // 4) کد تخفیف استفاده شد؟
  const discs = await jget("/api/admin/discounts", adminH);
  const disc = discs.discounts.find((d) => d.code === code);
  console.log("DISCOUNT used_count:", disc.used_count, "reservations:", disc.reservation_count);

  // 5) کنسل → اعلان کنسلی + آزادسازی تخفیف
  const cancel = await jpost(`/api/admin/reservations/${r.id}/cancel`, {}, adminH);
  console.log("CANCEL:", cancel.d.success, cancel.d.message);
  const afterCancel = await jget("/api/admin/notifications?limit=5", adminH);
  console.log("NOTIF latest:", afterCancel.notifications[0].type);
  const discs2 = await jget("/api/admin/discounts", adminH);
  console.log("DISCOUNT used_count after cancel:", discs2.discounts.find((d) => d.code === code).used_count);

  // 6) پاک‌سازی کد تست
  const del = await jpost(`/api/admin/discounts/${created.d.discount.id}/toggle`, {}, adminH);
  await fetch(API + `/api/admin/discounts/${created.d.discount.id}`, { method: "DELETE", headers: adminH });
  console.log("CLEANUP: test discount removed");

  process.exit(0);
})().catch((e) => { console.error("TEST ERROR:", e.message); process.exit(1); });