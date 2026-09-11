const { pool } = require("../src/config/db");

async function migrate() {
  const conn = await pool.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Add refund card fields to reservations table
    const [cols] = await conn.execute(`SHOW COLUMNS FROM reservations LIKE 'refund_card_number'`);
    if (cols.length === 0) {
      await conn.execute(`ALTER TABLE reservations ADD COLUMN refund_card_number VARCHAR(20) NULL AFTER admin_notes`);
      await conn.execute(`ALTER TABLE reservations ADD COLUMN refund_card_holder_name VARCHAR(100) NULL AFTER refund_card_number`);
      console.log("✅ Added refund_card_number and refund_card_holder_name to reservations");
    } else {
      console.log("⏭️  refund_card_number already exists, skipping");
    }

    // 2. Create refunds table if not exists
    const [tables] = await conn.execute(`SHOW TABLES LIKE 'refunds'`);
    if (tables.length === 0) {
      await conn.execute(`
        CREATE TABLE refunds (
          id INT AUTO_INCREMENT PRIMARY KEY,
          reservation_id INT NOT NULL,
          requested_by INT NULL,
          processed_by INT NULL,
          amount INT NOT NULL,
          refund_card_number VARCHAR(20) NULL,
          refund_card_holder_name VARCHAR(100) NULL,
          status ENUM('PENDING','APPROVED','PAID','REJECTED','CANCELLED') DEFAULT 'PENDING',
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP NULL,
          admin_note TEXT NULL,
          rejection_reason TEXT NULL,
          transaction_ref VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
          INDEX idx_reservation_id (reservation_id),
          INDEX idx_status (status),
          INDEX idx_requested_at (requested_at)
        )
      `);
      console.log("✅ Created refunds table");
    } else {
      console.log("⏭️  refunds table already exists, skipping");
    }

    await conn.commit();
    console.log("✅ Migration completed successfully");
  } catch (err) {
    await conn.rollback();
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    conn.release();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
