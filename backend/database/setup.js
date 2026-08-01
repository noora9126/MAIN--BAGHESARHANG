// اجرا: node database/setup.js
// ساخت خودکار جداول جدید (بدون حذف جداول موجود)
const { query, pool } = require("../src/config/db");
require("dotenv").config();

const TABLES = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100),
    name VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN','SUPER_ADMIN') DEFAULT 'ADMIN',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_number VARCHAR(30) NOT NULL UNIQUE,
    room_id INT NOT NULL,
    room_number VARCHAR(20),
    room_name VARCHAR(100),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    number_of_nights INT NOT NULL DEFAULT 1,
    number_of_guests INT NOT NULL DEFAULT 1,
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL DEFAULT '',
    guest_national_id VARCHAR(10) NULL,
    special_requests TEXT,
    price_per_night INT NOT NULL,
    total_price INT NOT NULL,
    status ENUM('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED') DEFAULT 'PENDING',
    payment_status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'PENDING',
    sms_status ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
    authority VARCHAR(200),
    ref_id VARCHAR(100),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    paid_at DATETIME,
    checked_in_at DATETIME,
    checked_out_at DATETIME,
    INDEX idx_room_dates (room_id, check_in, check_out),
    INDEX idx_status (status),
    INDEX idx_payment (payment_status),
    INDEX idx_guest_phone (guest_phone),
    INDEX idx_guest_email (guest_email),
    INDEX idx_guest_national_id (guest_national_id),
    INDEX idx_check_in (check_in),
    INDEX idx_created (created_at)
  )`,

  `CREATE TABLE IF NOT EXISTS phone_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    status ENUM('PENDING','VERIFIED','EXPIRED') DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone)
  )`,

  `CREATE TABLE IF NOT EXISTS sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    reservation_id INT,
    status ENUM('SENT','FAILED') DEFAULT 'SENT',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_created (created_at)
  )`,

  `CREATE TABLE IF NOT EXISTS reservation_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL UNIQUE,
    amount INT NOT NULL,
    authority VARCHAR(200),
    ref_id VARCHAR(100),
    status ENUM('INITIATED','SUCCESS','FAILED') DEFAULT 'INITIATED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS guest_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    notes TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
];

// ستون‌های اختیاری برای جدول rooms (در دیتابیس‌های قدیمی وجود ندارند)
const ALTERS = [
  "ALTER TABLE rooms ADD COLUMN room_number VARCHAR(20) NULL",
  "ALTER TABLE rooms ADD COLUMN type VARCHAR(50) NULL",
  "ALTER TABLE reservations ADD COLUMN guest_national_id VARCHAR(10) NULL",
  "ALTER TABLE reservations ADD INDEX idx_guest_national_id (guest_national_id)",
];

async function run() {
  console.log("🔄 شروع ساخت جداول...");
  for (const sql of TABLES) {
    try {
      await query(sql);
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`✅ ${name}`);
    } catch (err) {
      console.error("❌ ساخت جدول ناموفق:", err.message);
    }
  }

  console.log("🔄 افزودن ستون‌های اختیاری به rooms...");
  for (const sql of ALTERS) {
    try {
      await query(sql);
      console.log(`✅ ${sql}`);
    } catch {
      // ستون از قبل وجود دارد
    }
  }
  console.log("🎉 تمام شد. حالا اجرا کنید: npm run seed");
  pool.end();
}

run();
