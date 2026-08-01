const { query } = require("../config/db");
const { toJalaliString, toJalaliMonthName } = require("../utils/jalali");

const ACTIVE_STAY = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"];

// ─────────────── داشبورد ───────────────
const dashboard = async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [[total], [monthly], [revenue], [monthlyRevenue], [pendingPayments], [todayRes], [todayCheckIn], [roomsCount], [avgNights]] =
      await Promise.all([
        query(`SELECT COUNT(*) AS c FROM reservations`),
        query(`SELECT COUNT(*) AS c FROM reservations WHERE created_at >= ?`, [monthStart]),
        query(`SELECT COALESCE(SUM(total_price),0) AS s FROM reservations WHERE payment_status = 'SUCCESS'`),
        query(`SELECT COALESCE(SUM(total_price),0) AS s FROM reservations WHERE payment_status = 'SUCCESS' AND paid_at >= ?`, [monthStart]),
        query(`SELECT COUNT(*) AS c FROM reservations WHERE payment_status = 'PENDING' AND status <> 'CANCELLED'`),
        query(`SELECT COUNT(*) AS c FROM reservations WHERE check_in = ? AND status IN ('PENDING','CONFIRMED')`, [today]),
        query(`SELECT COUNT(*) AS c FROM reservations WHERE DATE(checked_in_at) = ?`, [today]),
        query(`SELECT COUNT(*) AS c FROM rooms WHERE status = 'active'`),
        query(
          `SELECT AVG(number_of_nights) AS a FROM reservations WHERE status IN ('CHECKED_OUT','CHECKED_IN','CONFIRMED')`
        ),
      ]);

    // درصد اشغال ماه جاری
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalRoomNights = roomsCount.c * daysInMonth;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const endStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
    const startStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const bookedNights = await countBookedNights(startStr, endStr);
    const occupancy = totalRoomNights > 0 ? Math.round((bookedNights / totalRoomNights) * 100) : 0;

    // روند درآمد 6 ماه اخیر (هر 2 ماه شمسی/میلادی)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const rows = await query(
        `SELECT COALESCE(SUM(total_price),0) AS s, COUNT(*) AS c
         FROM reservations
         WHERE payment_status = 'SUCCESS' AND paid_at >= ? AND paid_at <= ?`,
        [start, end]
      );
      trend.push({
        month: toJalaliMonthName(start),
        revenue: Number(rows[0].s),
        count: Number(rows[0].c),
      });
    }

    // عملکرد اتاق‌ها
    const roomStats = await query(
      `SELECT rm.id, rm.name, rm.image, rm.price_per_night,
              COUNT(r.id) AS bookings,
              COALESCE(SUM(CASE WHEN r.payment_status = 'SUCCESS' THEN r.total_price ELSE 0 END), 0) AS revenue
       FROM rooms rm
       LEFT JOIN reservations r ON r.room_id = rm.id AND r.status <> 'CANCELLED'
       WHERE rm.status = 'active'
       GROUP BY rm.id
       ORDER BY revenue DESC`
    );

    res.json({
      success: true,
      data: {
        totalReservations: total.c,
        monthlyReservations: monthly.c,
        totalRevenue: Number(revenue.s),
        monthlyRevenue: Number(monthlyRevenue.s),
        occupancy,
        pendingPayments: pendingPayments.c,
        todayReservations: todayRes.c,
        todayCheckIns: todayCheckIn.c,
        averageNights: avgNights.a ? Number(avgNights.a).toFixed(1) : 0,
        trend,
        topRooms: roomStats.slice(0, 4),
      },
    });
  } catch (err) {
    console.error("dashboard error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── گزارش درآمد ───────────────
const revenue = async (req, res) => {
  try {
    const { from, to, groupBy = "month" } = req.query;
    const groupCol = groupBy === "day" ? "DATE(paid_at)" : groupBy === "year" ? "YEAR(paid_at)" : "DATE_FORMAT(paid_at, '%Y-%m')";

    let sql = `
      SELECT ${groupCol} AS period, COALESCE(SUM(total_price),0) AS revenue, COUNT(*) AS count
      FROM reservations
      WHERE payment_status = 'SUCCESS'
    `;
    const params = [];
    if (from) {
      sql += " AND paid_at >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND paid_at <= ?";
      params.push(to);
    }
    sql += ` GROUP BY period ORDER BY period ASC`;

    const rows = await query(sql, params);
    const data = rows.map((r) => ({
      period: r.period,
      label: groupBy === "day" ? toJalaliString(r.period) : toJalaliMonthName(r.period),
      revenue: Number(r.revenue),
      count: Number(r.count),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("revenue analytics error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── درصد اشغال روزانه ───────────────
const occupancy = async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: "بازه تاریخ الزامی است" });
    }

    const rooms = await query(`SELECT COUNT(*) AS c FROM rooms WHERE status = 'active'`);
    const totalRooms = rooms[0].c || 1;

    const rows = await query(
      `SELECT check_in, check_out, status FROM reservations
       WHERE status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT','PENDING')
         AND check_in < ? AND check_out > ?`,
      [to, from]
    );

    const data = [];
    const cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) {
      const ds = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
      let booked = 0;
      for (const r of rows) {
        const rs = r.check_in instanceof Date ? dateStr(r.check_in) : r.check_in;
        const re = r.check_out instanceof Date ? dateStr(r.check_out) : r.check_out;
        if (ds >= rs && ds < re) booked++;
      }
      data.push({
        date: ds,
        label: toJalaliString(ds),
        occupancy: Math.round((booked / totalRooms) * 100),
        booked,
        available: Math.max(0, totalRooms - booked),
      });
      cur.setDate(cur.getDate() + 1);
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("occupancy analytics error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── عملکرد اتاق‌ها ───────────────
const roomsPerformance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to ? "AND r.check_in >= ? AND r.check_in <= ?" : "";
    const params = from && to ? [from, to] : [];

    const rows = await query(
      `SELECT rm.id, rm.name, rm.image, rm.price_per_night, rm.capacity,
              COUNT(r.id) AS bookings,
              COALESCE(SUM(CASE WHEN r.payment_status = 'SUCCESS' THEN r.total_price ELSE 0 END),0) AS revenue,
              COALESCE(SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.number_of_nights ELSE 0 END),0) AS roomNights
       FROM rooms rm
       LEFT JOIN reservations r ON r.room_id = rm.id ${dateFilter}
       WHERE rm.status = 'active'
       GROUP BY rm.id
       ORDER BY revenue DESC`,
      params
    );

    res.json({
      success: true,
      rooms: rows.map((r) => ({
        id: r.id,
        name: r.name,
        image: r.image,
        pricePerNight: Number(r.price_per_night),
        capacity: r.capacity,
        bookings: Number(r.bookings),
        revenue: Number(r.revenue),
        roomNights: Number(r.roomNights),
      })),
    });
  } catch (err) {
    console.error("roomsPerformance error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

// ─────────────── آماری مهمانان ───────────────
const guestStats = async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [[totalGuests], [newThisMonth], [repeat]] = await Promise.all([
      query(`SELECT COUNT(DISTINCT guest_phone) AS c FROM reservations WHERE guest_phone <> ''`),
      query(`SELECT COUNT(DISTINCT guest_phone) AS c FROM reservations WHERE guest_phone <> '' AND created_at >= ?`, [monthStart]),
      query(
        `SELECT COUNT(*) AS c FROM (SELECT guest_phone FROM reservations WHERE guest_phone <> '' GROUP BY guest_phone HAVING COUNT(*) > 1) t`
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalGuests: totalGuests.c,
        newThisMonth: newThisMonth.c,
        repeatGuests: repeat.c,
      },
    });
  } catch (err) {
    console.error("guestStats error:", err);
    res.status(500).json({ success: false, message: "خطای سرور" });
  }
};

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// تعداد شب‌های رزروشده در بازه (برای اشغال)
async function countBookedNights(startStr, endStr) {
  const rows = await query(
    `SELECT check_in, check_out FROM reservations
     WHERE status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT','PENDING')
       AND check_in < ? AND check_out > ?`,
    [endStr, startStr]
  );
  const s = new Date(startStr);
  const e = new Date(endStr);
  let total = 0;
  for (const r of rows) {
    const rs = new Date(dateStr(r.check_in instanceof Date ? r.check_in : new Date(r.check_in)));
    const re = new Date(dateStr(r.check_out instanceof Date ? r.check_out : new Date(r.check_out)));
    const start = rs > s ? rs : s;
    const end = re < e ? re : e;
    if (end > start) {
      total += Math.round((end - start) / (1000 * 60 * 60 * 24));
    }
  }
  return total;
}

module.exports = { dashboard, revenue, occupancy, roomsPerformance, guestStats };
