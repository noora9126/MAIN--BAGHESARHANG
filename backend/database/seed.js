// اجرا: npm run seed
// ساخت ادمین پیش‌فرض و تنظیمات اولیه
const bcrypt = require("bcryptjs");
const { query, pool } = require("../src/config/db");
require("dotenv").config();

const username = process.env.ADMIN_USERNAME || "amiraliriazi_hotel_manager";
const password = process.env.ADMIN_PASSWORD || "V7!qR2#Lm9@Xz4$Np8";
const name = process.env.ADMIN_NAME || "مدیر هتل";
const email = process.env.ADMIN_EMAIL || "admin@baghsarhang.ir";

const SUPER_ADMIN_USERNAME = "root_baghesar_admin";
const SUPER_ADMIN_PASSWORD = "Xp!9#wKq2$mZ7@nR4&jT6^bL8";
const SUPER_ADMIN_NAME = "مدیر ارشد سیستم";
const SUPER_ADMIN_EMAIL = "superadmin@baghsarhang.ir";

const RECEPTIONIST_USERNAME = "reception_baghesar_01";
const RECEPTIONIST_PASSWORD = "Qw5$rT8#yU2@iO6!pA3";
const RECEPTIONIST_NAME = "پذیرش هتل";
const RECEPTIONIST_EMAIL = "reception@baghsarhang.ir";

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

function generateSecurePassword(length = 24) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const all = uppercase + lowercase + numbers + symbols;
  let pw = "";
  pw += uppercase[Math.floor(Math.random() * uppercase.length)];
  pw += lowercase[Math.floor(Math.random() * lowercase.length)];
  pw += numbers[Math.floor(Math.random() * numbers.length)];
  pw += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = pw.length; i < length; i++) {
    pw += all[Math.floor(Math.random() * all.length)];
  }
  return pw;
}

async function ensureUser(usr, pwd, nm, em, role) {
  const hash = await bcrypt.hash(pwd, 10);
  const existing = await query(`SELECT id FROM admin_users WHERE username = ? LIMIT 1`, [usr]);
  if (existing.length === 0) {
    await query(
      `INSERT INTO admin_users (username, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [usr, em, nm, hash, role]
    );
    console.log(`✅ ${role} ساخته شد: ${usr}`);
  } else {
    await query(`UPDATE admin_users SET role = ?, password_hash = ?, name = ?, email = ? WHERE username = ?`, [
      role,
      hash,
      nm,
      em,
      usr,
    ]);
    console.log(`✅ ${role} به‌روزرسانی شد: ${usr}`);
  }
}

async function run() {
  // ── ادمین پیش‌فرض (HOSTEL_ADMIN) ──
  const hostHash = await bcrypt.hash(password, 10);
  const existing = await query(`SELECT id FROM admin_users WHERE username = ?`, [username]);
  if (existing.length === 0) {
    const old = await query(`SELECT id FROM admin_users WHERE username = 'admin' LIMIT 1`);
    if (old.length > 0) {
      await query(`UPDATE admin_users SET username = ?, password_hash = ?, name = ?, email = ?, role = 'ADMIN' WHERE id = ?`, [
        username,
        hostHash,
        name,
        email,
        old[0].id,
      ]);
      console.log(`✅ ادمین به نام کاربری جدید تغییر کرد: ${username}`);
    } else {
      await query(
        `INSERT INTO admin_users (username, email, name, password_hash, role) VALUES (?, ?, ?, ?, 'ADMIN')`,
        [username, email, name, hostHash]
      );
      console.log(`✅ ادمین ساخته شد: ${username}`);
    }
  } else {
    await query(`UPDATE admin_users SET password_hash = ?, name = ?, email = ? WHERE username = ?`, [
      hostHash,
      name,
      email,
      username,
    ]);
    console.log(`✅ ادمین موجود به‌روزرسانی شد: ${username}`);
  }

  // ── SUPER_ADMIN ──
  await ensureUser(SUPER_ADMIN_USERNAME, SUPER_ADMIN_PASSWORD, SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, "SUPER_ADMIN");

  // ── RECEPTIONIST ──
  await ensureUser(RECEPTIONIST_USERNAME, RECEPTIONIST_PASSWORD, RECEPTIONIST_NAME, RECEPTIONIST_EMAIL, "RECEPTIONIST");

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await query(
      `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = setting_value`,
      [key, value]
    );
  }
  console.log("✅ تنظیمات پیش‌فرض ثبت شد");

  console.log("🎉 Seed کامل شد");
  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  حساب‌های ایجاد شده:                               ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  SUPER_ADMIN: ${SUPER_ADMIN_USERNAME.padEnd(37)}║`);
  console.log(`║  HOTEL_ADMIN: ${username.padEnd(37)}║`);
  console.log(`║  RECEPTIONIST: ${RECEPTIONIST_USERNAME.padEnd(36)}║`);
  console.log("╚══════════════════════════════════════════════════════╝");

  pool.end();
}

run().catch((err) => {
  console.error("❌ خطا در Seed:", err);
  pool.end();
});
