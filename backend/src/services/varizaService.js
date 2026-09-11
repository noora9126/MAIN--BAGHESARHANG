/*
 * Variza Payment Service (لایه ارتباط با API واریزا)
 * ─────────────────────────────────────────────────────
 * مبنای پیاده‌سازی: مستندات رسمی https://variza.ir/developers
 *
 * - ساخت لینک پرداخت:  POST https://variza.ir/api/v1/pay
 *   Header: Authorization: Bearer <VARIZA_API_KEY>
 *   Body:   { amount (تومان، حداقل ۱۰۰۰), return_url (https), title?, expires_in? }
 *   201 →   { slug, pay_url, amount, title, return_url, expires_at }
 *
 * - اعتبارسنجی Webhook:
 *   X-Webhook-Signature: sha256=<HMAC-SHA256(rawBody, VARIZA_WEBHOOK_SECRET)>
 *   مقایسه به‌صورت timing-safe روی بدنه‌ی خام.
 *
 * این ماژول هیچ منطق دیتابیسی ندارد؛ orchestration در paymentService است.
 */

const crypto = require("crypto");
const axios = require("axios");
const { logPaymentWarning } = require("../utils/paymentLogger");

// Base URL رسمی API واریزا (قابل override برای تست)
function baseUrl() {
  return process.env.VARIZA_BASE_URL || "https://variza.ir";
}

// خواندن امن متغیر محیطی: حذف فاصله و کوتیشن اضافه که باعث خرابی کلید می‌شود
function envVal(name) {
  return String(process.env[name] || "")
    .trim()
    .replace(/^["']+|["']+$/g, "");
}

function apiKey() {
  return envVal("VARIZA_API_KEY");
}

function webhookSecret() {
  return envVal("VARIZA_WEBHOOK_SECRET");
}

function varizaConfigured() {
  return Boolean(apiKey() && webhookSecret());
}

function apiKeyConfigured() {
  return Boolean(apiKey());
}

function webhookSecretConfigured() {
  return Boolean(webhookSecret());
}

/*
 * خطای استاندارد داخلی — هرگز آبجکت خام axios (شامل Authorization header)
 * به بالا ارسال نمی‌شود؛ فقط code/status/پیام امن.
 */
function varizaError(code, message, status) {
  const err = new Error(message);
  err.code = code;
  if (status) err.status = status;
  return err;
}

// نگاشت خطاهای HTTP واریزا به خطای داخلی امن (بدون لو دادن Credential)
function mapVarizaHttpError(err) {
  if (err.code === "ECONNABORTED") {
    return varizaError("VARIZA_TIMEOUT", "زمان اتصال به درگاه پرداخت به پایان رسید", 504);
  }
  if (!err.response) {
    return varizaError("VARIZA_UNAVAILABLE", "درگاه پرداخت موقتاً در دسترس نیست", 503);
  }

  const { status } = err.response;
  switch (status) {
    case 401:
      // کلید API نامعتبر یا ناقص
      return varizaError("VARIZA_AUTH_FAILED", "خطای پیکربندی درگاه پرداخت", 502);
    case 422:
      // فیلدهای نامعتبر / callback_url ثبت نشده / کارت مقصد غیرفعال / محدودیت اشتراک
      return varizaError(
        "VARIZA_VALIDATION",
        "درگاه پرداخت درخواست را نپذیرفت",
        502,
      );
    case 429:
      return varizaError("VARIZA_RATE_LIMITED", "حجم درخواست به درگاه زیاد است؛ کمی بعد تلاش کنید", 429);
    default:
      return varizaError("VARIZA_UNAVAILABLE", "درگاه پرداخت موقتاً در دسترس نیست", 503);
  }
}

/*
 * ساخت Payment Link اختصاصی برای یک سفارش
 * amount فقط از Backend و از رکورد Order معتبر گرفته می‌شود (واحد: تومان)
 */
async function createPaymentLink({ amount, returnUrl, title, expiresIn }) {
  if (!apiKeyConfigured()) {
    throw varizaError("VARIZA_NOT_CONFIGURED", "درگاه پرداخت کارت‌به‌کارت تنظیم نشده است", 503);
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum < 1000) {
    throw varizaError("VARIZA_AMOUNT_TOO_LOW", "مبلغ سفارش برای پرداخت آنلاین معتبر نیست", 400);
  }

  const payload = {
    amount: Math.round(amountNum),
    return_url: returnUrl,
    ...(title ? { title } : {}),
    ...(expiresIn ? { expires_in: expiresIn } : { expires_in: process.env.VARIZA_LINK_EXPIRY || "1h" }),
  };

  let res;
  try {
    res = await axios.post(`${baseUrl()}/api/v1/pay`, payload, {
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      timeout: Number(process.env.VARIZA_API_TIMEOUT_MS || 15000),
      // هیچ هدری از response/log عبور داده نشود که کلید را داشته باشد
      validateStatus: null,
    });
  } catch (err) {
    throw mapVarizaHttpError(err);
  }

  if (res.status !== 200 && res.status !== 201) {
    // لاگ دلیل رد شدن سمت واریزا (بدون هیچ اطلاعات حساس) برای دیباگ سریع
    const body = res.data || {};
    logPaymentWarning("variza_api_rejected", {
      httpStatus: res.status,
      message: typeof body.message === "string" ? body.message : undefined,
      errorFields: body.errors ? Object.keys(body.errors) : undefined,
    });
    throw mapVarizaHttpError(Object.assign(new Error("variza http error"), { response: res }));
  }

  const data = res.data || {};
  if (!data.pay_url || !data.slug) {
    throw varizaError("VARIZA_INVALID_RESPONSE", "پاسخ نامعتبر از درگاه پرداخت", 502);
  }

  return {
    payUrl: data.pay_url,
    slug: data.slug,
    amount: data.amount ?? payload.amount,
    returnUrl: data.return_url ?? payload.return_url,
    title: data.title ?? payload.title ?? null,
    expiresAt: data.expires_at || null,
  };
}

/*
 * اعتبارسنجی امضای Webhook — HMAC-SHA256 روی RAW BODY
 * فرمت هدر طبق مستندات:  sha256=<hex>
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader || typeof signatureHeader !== "string") return false;

  let received = signatureHeader.trim();
  if (received.toLowerCase().startsWith("sha256=")) {
    received = received.slice(7).trim();
  } else {
    // طبق قرارداد رسمی امضا همیشه با پیشوند sha256= ارسال می‌شود
    return false;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(received)) return false;

  const secret = webhookSecret();
  if (!secret) return false;

  try {
    const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody ?? ""), "utf8");
    const computed = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const a = Buffer.from(computed, "utf8");
    const b = Buffer.from(received.toLowerCase(), "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/*
 * Parse بدنه Webhook — فقط event/status معتبر payment.paid پردازش می‌شود
 */
function parseWebhookEvent(rawBody) {
  try {
    const parsed = JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

module.exports = {
  baseUrl,
  varizaConfigured,
  apiKeyConfigured,
  webhookSecretConfigured,
  createPaymentLink,
  verifyWebhookSignature,
  parseWebhookEvent,
};
