// اجرا: npm run seed
// ساخت ادمین پیش‌فرض و تنظیمات اولیه
const bcrypt = require("bcryptjs");
const { query, pool } = require("../src/config/db");
require("dotenv").config();

const username = process.env.ADMIN_USERNAME || "admin";
const password = process.env.ADMIN_PASSWORD || "admin123";
const name = process.env.ADMIN_NAME || "مدیر هتل";
const email = process.env.ADMIN_EMAIL || "admin@baghsarhang.ir";

const DEFAULT_SETTINGS = {
  hotel_phone: "09112106640",
  hotel_phone2: "09392056082",
  hotel_email: "info@baghsarhang.ir",
  check_in_time: "14:00",
  check_out_time: "12:00",
  kavenegar_api_key: "",
  kavenegar_sender: "10004346",
  melipayamak_api_token: "",
  melipayamak_sender: "",
  zarinpal_merchant_id: "",
  zarinpal_sandbox: "1",
};

async function run() {
  const hash = await bcrypt.hash(password, 10);

  const existing = await query(`SELECT id FROM admin_users WHERE username = ?`, [username]);
  if (existing.length === 0) {
    await query(
      `INSERT INTO admin_users (username, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'SUPER_ADMIN')`,
      [username, email, name, hash]
    );
    console.log(`✅ ادمین ساخته شد: ${username} / ${password}`);
  } else {
    await query(`UPDATE admin_users SET password_hash = ?, name = ?, email = ? WHERE username = ?`, [
      hash,
      name,
      email,
      username,
    ]);
    console.log(`✅ ادمین موجود به‌روزرسانی شد: ${username}`);
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = setting_value`,
      [key, value]
    );
  }
  console.log("✅ تنظیمات پیش‌فرض ثبت شد");

  console.log("🎉 Seed کامل شد");
  pool.end();
}

run().catch((err) => {
  console.error("❌ خطا در Seed:", err);
  pool.end();
});
