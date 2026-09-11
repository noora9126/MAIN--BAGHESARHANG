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
    role ENUM('ADMIN','SUPER_ADMIN','RECEPTIONIST') DEFAULT 'ADMIN',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id INT NULL,
    room_id INT NOT NULL,
    room_number VARCHAR(20),
    room_name VARCHAR(100),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    number_of_nights INT NOT NULL DEFAULT 1,
    number_of_guests INT NOT NULL DEFAULT 1,
    number_of_adults INT NOT NULL DEFAULT 1,
    number_of_children INT NOT NULL DEFAULT 0,
    child_ages TEXT NULL,
    guest_details TEXT NULL,
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL DEFAULT '',
    guest_national_id VARCHAR(10) NULL,
    special_requests TEXT,
    price_per_night INT NOT NULL,
    total_price INT NOT NULL,
    discount_code VARCHAR(50) NULL,
    discount_percent INT NULL,
    discount_amount INT NULL,
    discount_reason VARCHAR(255) NULL,
    status ENUM('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','CANCELLATION_REQUESTED','REFUND_PENDING') DEFAULT 'PENDING',
    payment_status ENUM('PENDING','SUCCESS','FAILED') DEFAULT 'PENDING',
    sms_status ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
    authority VARCHAR(200),
    ref_id VARCHAR(100),
    admin_notes TEXT,
    refund_card_number VARCHAR(20) NULL,
    refund_card_holder_name VARCHAR(100) NULL,
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
    INDEX idx_created (created_at),
    INDEX idx_reservations_customer (customer_id)
  )`,

  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) NULL,
    national_code VARCHAR(10) NULL,
    password_hash VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 0,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_customers_mobile (mobile)
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

  `CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ref_type VARCHAR(50) NULL,
    ref_id INT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
  )`,

  `CREATE TABLE IF NOT EXISTS discount_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent INT NOT NULL,
    description TEXT,
    reason VARCHAR(255),
    customer_phones TEXT NULL,
    valid_from DATE NULL,
    valid_until DATE NULL,
    usage_limit INT NULL,
    used_count INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
  )`,

  `CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    source_url VARCHAR(255),
    author VARCHAR(100),
    rating DECIMAL(2,1),
    rating_label VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    stay_date VARCHAR(100),
    room_type VARCHAR(100),
    external_id VARCHAR(100),
    status ENUM('ACTIVE','HIDDEN') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review_source_ext (source, external_id),
    INDEX idx_source (source),
    INDEX idx_status (status)
  )`,

  `CREATE TABLE IF NOT EXISTS variza_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'variza',
    provider_slug VARCHAR(64) NULL UNIQUE,
    amount INT NOT NULL,
    status ENUM('pending','paid','failed','expired','cancelled') NOT NULL DEFAULT 'pending',
    attempt_code VARCHAR(64) NULL,
    delivery_id VARCHAR(128) NULL,
    payment_url VARCHAR(512) NULL,
    expires_at DATETIME NULL,
    paid_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_variza_reservation (reservation_id),
    INDEX idx_variza_status (status),
    CONSTRAINT fk_variza_payments_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id)
  )`,

  `CREATE TABLE IF NOT EXISTS payment_webhook_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(30) NOT NULL DEFAULT 'variza',
    delivery_id VARCHAR(128) NOT NULL UNIQUE,
    event VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    requested_by INT NULL,
    processed_by INT NULL,
    amount INT NOT NULL,
    refund_card_number VARCHAR(20) NULL,
    refund_card_holder_name VARCHAR(100) NULL,
    status ENUM('PENDING','APPROVED','PAID','REJECTED','CANCELLED') DEFAULT 'PENDING',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    admin_note TEXT NULL,
    rejection_reason TEXT NULL,
    transaction_ref VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    INDEX idx_refund_reservation (reservation_id),
    INDEX idx_refund_status (status),
    INDEX idx_refund_requested_at (requested_at)
  )`,

  `CREATE TABLE IF NOT EXISTS otp_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mobile VARCHAR(20) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    INDEX idx_otp_mobile (mobile)
  )`,
];

// ستون‌های اختیاری برای جدول rooms (در دیتابیس‌های قدیمی وجود ندارند)
const ALTERS = [
  "ALTER TABLE rooms ADD COLUMN room_number VARCHAR(20) NULL",
  "ALTER TABLE rooms ADD COLUMN type VARCHAR(50) NULL",
  "ALTER TABLE reservations ADD COLUMN guest_national_id VARCHAR(10) NULL",
  "ALTER TABLE reservations ADD INDEX idx_guest_national_id (guest_national_id)",
  "ALTER TABLE reservations ADD COLUMN number_of_adults INT NOT NULL DEFAULT 1",
  "ALTER TABLE reservations ADD COLUMN number_of_children INT NOT NULL DEFAULT 0",
  "ALTER TABLE reservations ADD COLUMN child_ages TEXT NULL",
  "ALTER TABLE reservations ADD COLUMN guest_details TEXT NULL",
  "ALTER TABLE phone_verifications MODIFY COLUMN code VARCHAR(64) NOT NULL",
  "ALTER TABLE phone_verifications ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'BOOKING'",
  "ALTER TABLE phone_verifications ADD INDEX idx_phone_purpose (phone, purpose)",
  "ALTER TABLE customers ADD COLUMN email VARCHAR(100) NULL",
  "ALTER TABLE customers ADD COLUMN password_hash VARCHAR(255) NULL",
  "ALTER TABLE customers ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 0",
  "ALTER TABLE customers ADD COLUMN last_login DATETIME NULL",
  "ALTER TABLE customers MODIFY COLUMN national_code VARCHAR(10) NULL",
  "ALTER TABLE reservations ADD COLUMN discount_code VARCHAR(50) NULL",
  "ALTER TABLE reservations ADD COLUMN discount_percent INT NULL",
  "ALTER TABLE reservations ADD COLUMN discount_amount INT NULL",
  "ALTER TABLE reservations ADD COLUMN discount_reason VARCHAR(255) NULL",
  "ALTER TABLE customers ADD COLUMN username VARCHAR(50) NULL UNIQUE",
  "ALTER TABLE customers ADD INDEX idx_customers_username (username)",
  "ALTER TABLE reservations ADD COLUMN customer_id INT NULL",
  "ALTER TABLE reservations ADD INDEX idx_reservations_customer (customer_id)",
  "ALTER TABLE admin_users MODIFY COLUMN role ENUM('ADMIN','SUPER_ADMIN','RECEPTIONIST') DEFAULT 'ADMIN'",
  "ALTER TABLE admin_users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1",
  "ALTER TABLE reservations ADD COLUMN refund_card_number VARCHAR(20) NULL",
  "ALTER TABLE reservations ADD COLUMN refund_card_holder_name VARCHAR(100) NULL",
  "ALTER TABLE reservations MODIFY COLUMN status ENUM('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','CANCELLATION_REQUESTED','REFUND_PENDING') DEFAULT 'PENDING'",
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_type VARCHAR(30) NOT NULL,
    actor_id INT NULL,
    actor_name VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NULL,
    resource_id INT NULL,
    ip VARCHAR(45) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_actor (actor_type, actor_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
  )`,
  `CREATE TABLE IF NOT EXISTS customer_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    ref_type VARCHAR(50) NULL,
    ref_id INT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cn_customer (customer_id),
    INDEX idx_cn_read (is_read),
    INDEX idx_cn_created (created_at),
    CONSTRAINT fk_cn_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  )`,
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
