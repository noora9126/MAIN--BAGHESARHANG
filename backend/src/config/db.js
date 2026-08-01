const mysql = require("mysql2");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "baghsarhang_db",
  waitForConnections: true,
  connectionLimit: 10,
});

pool.query("SELECT 1", (err) => {
  if (err) {
    console.error("❌ Database Error");
    console.error(err);
    return;
  }
  console.log("✅ MySQL Connected");
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
