const mysql = require("mysql2");
require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "baghsarhang_db",
  waitForConnections: true,
  connectionLimit: 10,
});

async function ensureRequiredColumns() {
  try {
    await query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS username VARCHAR(50) NULL UNIQUE`);
    await query(`ALTER TABLE phone_verifications ADD COLUMN IF NOT EXISTS purpose VARCHAR(30) NOT NULL DEFAULT 'BOOKING'`);
    console.log("✅ DB schema compatibility check passed");
  } catch (err) {
    console.warn("⚠️ Schema compatibility check skipped or failed:", err.message || err);
  }
}

pool.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database Error");
    console.error(err);
    return;
  }
  console.log("✅ MySQL Connected");
  ensureRequiredColumns();
});

// پکیج کردن query برای استفاده آسان با Promise
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

module.exports = { pool, query };
