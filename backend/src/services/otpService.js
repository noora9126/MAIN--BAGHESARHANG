const crypto = require("crypto");
const { query } = require("../config/db");
const { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES } = require("../utils/helpers");
const { sendOtp } = require("./smsService");

const MAX_ATTEMPTS = 3;

// درخواست کد تأیید برای یک شماره با هدف مشخص (BOOKING | REGISTER | RESET_PASSWORD)
// کد به صورت هش‌شده ذخیره می‌شود و جلسات قبلی همان شماره باطل می‌شوند.
async function requestOtp(phone, purpose = "BOOKING") {
  const code = generateOtpCode();
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE phone = ? AND status = 'PENDING'`, [phone]);

  await query(
    `INSERT INTO phone_verifications (session_id, phone, code, attempts, status, expires_at, purpose)
     VALUES (?, ?, ?, 0, 'PENDING', ?, ?)`,
    [sessionId, phone, hashOtpCode(code), expiresAt, purpose]
  );

  const result = await sendOtp(phone, code);
  return { sessionId, code, result };
}

// اعتبارسنجی کد: انقضا، یکبارمصرفی، محدودیت تلاش و تطبیق هش
// در صورت موفقیت جلسه VERIFIED می‌شود و شماره تاییدشده برمی‌گردد.
async function verifyOtp(sessionId, code, purpose = "BOOKING") {
  const hashed = hashOtpCode(code);
  const rows = await query(`SELECT * FROM phone_verifications WHERE session_id = ? LIMIT 1`, [sessionId]);
  const session = rows[0];

  if (!session || session.status === "EXPIRED" || session.purpose !== purpose) {
    return { success: false, status: 400, message: "جلسه نامعتبر است" };
  }

  if (new Date(session.expires_at) < new Date()) {
    await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
    return { success: false, status: 400, message: "کد منقضی شده است. دوباره درخواست دهید." };
  }

  if (session.status === "VERIFIED") {
    return { success: false, status: 400, message: "این کد قبلاً استفاده شده است. در صورت نیاز دوباره درخواست دهید." };
  }

  if (session.attempts >= MAX_ATTEMPTS) {
    await query(`UPDATE phone_verifications SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
    return { success: false, status: 429, message: "تعداد تلاش‌ها بیش از حد مجاز است. دوباره درخواست دهید." };
  }

  if (String(session.code) !== String(hashed)) {
    const attempts = session.attempts + 1;
    await query(`UPDATE phone_verifications SET attempts = ? WHERE id = ?`, [attempts, session.id]);
    return {
      success: false,
      status: 400,
      message: `کد اشتباه است. ${MAX_ATTEMPTS - attempts} تلاش باقی مانده.`,
      attemptsLeft: MAX_ATTEMPTS - attempts,
    };
  }

  await query(`UPDATE phone_verifications SET status = 'VERIFIED' WHERE id = ?`, [session.id]);
  return { success: true, phone: session.phone, message: "شماره تایید شد" };
}

// آیا این شماره برای هدف مشخص، جلسه تاییدشده فعال دارد؟
async function hasVerifiedSession(phone, purpose = "BOOKING") {
  const rows = await query(
    `SELECT id FROM phone_verifications WHERE phone = ? AND purpose = ? AND status = 'VERIFIED' ORDER BY id DESC LIMIT 1`,
    [phone, purpose]
  );
  return rows.length > 0;
}

module.exports = { requestOtp, verifyOtp, hasVerifiedSession, MAX_ATTEMPTS };
