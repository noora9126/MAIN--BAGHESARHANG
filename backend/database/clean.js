// اجرا: node database/clean.js
// پاکسازی کامل اطلاعات تستی — بدون حذف اتاق‌ها، تنظیمات، کاربران ادمین و کدهای تخفیف
const { query, pool } = require("../src/config/db");
require("dotenv").config();

const CLEANUP_SQL = [
  // غیرفعال‌سازی بررسی foreign key برای پاکسازی سریع
  "SET FOREIGN_KEY_CHECKS = 0",

  // حذف رزروها (اصلی‌ترین جدول تراکنش)
  "TRUNCATE TABLE reservations",

  // حذف سوابق پرداخت
  "TRUNCATE TABLE reservation_payments",
  "TRUNCATE TABLE variza_payments",
  "TRUNCATE TABLE payment_webhook_deliveries",

  // حذف کاربران مهمان
  "TRUNCATE TABLE customers",

  // حذف کدهای OTP
  "TRUNCATE TABLE otp_codes",
  "TRUNCATE TABLE phone_verifications",

  // حذف پیامک‌ها
  "TRUNCATE TABLE sms_logs",

  // حذف اعلان‌ها
  "TRUNCATE TABLE notifications",
  "TRUNCATE TABLE customer_notifications",

  // حذف یادداشت مهمانان
  "TRUNCATE TABLE guest_notes",

  // حذف لاگ عملیات ادمین
  "TRUNCATE TABLE audit_logs",

  // حذف نظرات تستی
  "TRUNCATE TABLE reviews",

  // بازگرداندن بررسی foreign key
  "SET FOREIGN_KEY_CHECKS = 1",
];

async function clean() {
  console.log("=== شروع پاکسازی پایگاه داده ===\n");

  for (const sql of CLEANUP_SQL) {
    try {
      await query(sql);
      const label = sql.replace(/\s+/g, " ").trim();
      console.log(`  ✓ ${label}`);
    } catch (err) {
      console.error(`  ✗ خطا: ${err.message}`);
    }
  }

  // بازنشانی شمارنده خودکار جدول‌ها
  const resetAutoIncrement = [
    "reservations",
    "reservation_payments",
    "variza_payments",
    "payment_webhook_deliveries",
    "customers",
    "otp_codes",
    "phone_verifications",
    "sms_logs",
    "notifications",
    "customer_notifications",
    "guest_notes",
    "audit_logs",
    "reviews",
  ];

  console.log("\n=== بازنشانی شمارنده خودکار ===");
  for (const table of resetAutoIncrement) {
    try {
      await query(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
      console.log(`  ✓ ${table} → AUTO_INCREMENT = 1`);
    } catch {
      // جدول ممکن است وجود نداشته باشد
    }
  }

  // نمایش خلاصه وضعیت
  console.log("\n=== وضعیت نهایی ===");
  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM admin_users) AS admins,
      (SELECT COUNT(*) FROM rooms) AS rooms,
      (SELECT COUNT(*) FROM customers) AS customers,
      (SELECT COUNT(*) FROM reservations) AS reservations,
      (SELECT COUNT(*) FROM discount_codes) AS discount_codes,
      (SELECT COUNT(*) FROM settings) AS settings
  `);
  const c = counts[0];
  console.log(`  ادمین‌ها:    ${c.admins}`);
  console.log(`  اتاق‌ها:     ${c.rooms}`);
  console.log(`  مهمانان:     ${c.customers}`);
  console.log(`  رزروها:      ${c.reservations}`);
  console.log(`  کد تخفیف:    ${c.discount_codes}`);
  console.log(`  تنظیمات:     ${c.settings}`);

  console.log("\n✅ پاکسازی کامل شد — پایگاه داده خام و آماده استقرار روی هاست\n");
  await pool.end();
}

clean().catch((err) => {
  console.error("خطا در پاکسازی:", err);
  process.exit(1);
});
