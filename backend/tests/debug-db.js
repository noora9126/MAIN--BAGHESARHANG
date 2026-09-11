const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const conn = await mysql.createConnection({host: process.env.DB_HOST||'localhost', user: process.env.DB_USER||'root', password: process.env.DB_PASSWORD||'', database: process.env.DB_NAME||'baghsarhang_db'});
  const [roomRows] = await conn.execute('SELECT id FROM rooms ORDER BY id LIMIT 1');
  console.log('rooms ok:', roomRows.length);
  const [r1] = await conn.execute(
    `INSERT INTO reservations (reservation_number, room_id, room_name, check_in, check_out, number_of_nights,
      guest_name, guest_email, guest_phone, price_per_night, total_price, status, payment_status)
     VALUES (?, ?, 'ITest Room', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 2,
      'تست پرداخت', ?, '09999999999', 250000, 500000, 'PENDING', 'PENDING')`,
    ['DBG-'+Date.now(), roomRows[0].id, 'dbg@example.com']
  );
  console.log('insert id:', r1.insertId);
  const [afterFail] = await conn.execute('SELECT payment_status FROM reservations WHERE id=?', [r1.insertId]);
  console.log('select rows:', JSON.stringify(afterFail));
  await conn.execute('DELETE FROM reservations WHERE id=?', [r1.insertId]);
  await conn.end();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
