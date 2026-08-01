const axios = require("axios");
const { query } = require("../config/db");

const SANDBOX_BASE = "https://sandbox.zarinpal.com/pg/v4/payment";
const PROD_BASE = "https://api.zarinpal.com/pg/v4/payment";

function isSandbox() {
  return process.env.ZARINPAL_SANDBOX === "1" || process.env.ZARINPAL_SANDBOX === "true";
}

function baseUrl() {
  return isSandbox() ? SANDBOX_BASE : PROD_BASE;
}

function merchantId() {
  return process.env.ZARINPAL_MERCHANT_ID || "";
}

function zarinpalConfigured() {
  return Boolean(merchantId());
}

// شروع پرداخت: درخواست authority از زرین‌پال
async function requestPayment({ amount, description, orderId, callbackUrl }) {
  if (!zarinpalConfigured()) {
    const err = new Error("ZARINPAL_MERCHANT_ID تنظیم نشده است");
    err.code = "ZARINPAL_NOT_CONFIGURED";
    throw err;
  }

  const res = await axios.post(
    `${baseUrl()}/request.json`,
    {
      merchant_id: merchantId(),
      amount: Number(amount),
      description,
      callback_url: callbackUrl,
      metadata: { order_id: String(orderId) },
    },
    { timeout: 20000 }
  );

  const data = res.data?.data || {};
  if (data.code !== 100) {
    const err = new Error(`زرین‌پال: ${data.message || "خطای ناشناخته"}`);
    err.code = "ZARINPAL_REQUEST_FAILED";
    throw err;
  }

  const startPay = isSandbox()
    ? `https://sandbox.zarinpal.com/pg/StartPay/${data.authority}`
    : `https://www.zarinpal.com/pg/StartPay/${data.authority}`;

  return { authority: data.authority, paymentURL: startPay, message: data.message };
}

// تایید پرداخت: بررسی صحت تراکنش
async function verifyPayment({ authority, amount }) {
  if (!zarinpalConfigured()) {
    const err = new Error("ZARINPAL_MERCHANT_ID تنظیم نشده است");
    err.code = "ZARINPAL_NOT_CONFIGURED";
    throw err;
  }

  const res = await axios.post(
    `${baseUrl()}/verify.json`,
    {
      merchant_id: merchantId(),
      authority,
      amount: Number(amount),
    },
    { timeout: 20000 }
  );

  const data = res.data?.data || {};
  if (data.code !== 100) {
    return { success: false, code: data.code, message: data.message };
  }

  return { success: true, code: data.code, refId: data.ref_id, message: data.message };
}

// نگاشت تنظیمات ذخیره‌شده در دیتابیس به متغیرهای محیطی
const DB_SETTINGS_MAP = {
  zarinpal_merchant_id: "ZARINPAL_MERCHANT_ID",
  zarinpal_sandbox: "ZARINPAL_SANDBOX",
  melipayamak_api_token: "MELIPAYAMAK_API_TOKEN",
  melipayamak_sender: "MELIPAYAMAK_SENDER",
};

// بارگذاری تنظیمات زرین‌پال و ملی‌پیامک از دیتابیس (پنل مدیریت)
async function saveSettingsFromDb() {
  try {
    const rows = await query("SELECT setting_key, setting_value FROM settings");
    for (const row of rows) {
      if (row.setting_value === undefined || row.setting_value === null) continue;
      const value = String(row.setting_value).trim();
      if (value === "") continue; // مقادیر خالی نباید تنظیمات .env را پاک کنند
      process.env[DB_SETTINGS_MAP[row.setting_key] || row.setting_key] = value;
    }
  } catch {
    // جدول settings هنوز ساخته نشده باشد، نادیده بگیر
  }
}

module.exports = {
  isSandbox,
  baseUrl,
  merchantId,
  zarinpalConfigured,
  requestPayment,
  verifyPayment,
  saveSettingsFromDb,
};
