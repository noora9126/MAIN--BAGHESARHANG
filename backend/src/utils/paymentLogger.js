/*
 * Structured payment event logger
 * ─────────────────────────────────
 * فقط رویدادهای ساختاریافته را با متادیتای امن لاگ می‌کند.
 * هرگز کل آبجکت Error (که ممکن است Authorization header / API Key داشته باشد)
 * یا مقادیر sensitive را لاگ نمی‌کند.
 */

const SENSITIVE_KEYS = [
  "authorization",
  "apikey",
  "api_key",
  "webhooksecret",
  "webhook_secret",
  "password",
  "token",
  "secret",
  "cardnumber",
];

function redact(meta) {
  if (!meta || typeof meta !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(meta)) {
    const normalized = key.toLowerCase().replace(/[_\s-]/g, "");
    if (SENSITIVE_KEYS.includes(normalized)) {
      out[key] = "[REDACTED]";
      continue;
    }
    if (value instanceof Error) {
      out[key] = { name: value.name, code: value.code, message: value.message };
      continue;
    }
    if (typeof value === "object" && value !== null) {
      out[key] = Array.isArray(value) ? `[${value.length} items]` : redact(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function logPaymentEvent(event, meta = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    scope: "payment",
    event,
    ...redact(meta),
  });
  console.log(line);
}

function logPaymentWarning(event, meta = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: "warn",
    scope: "payment",
    event,
    ...redact(meta),
  });
  console.warn(line);
}

function logPaymentError(event, meta = {}, err) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level: "error",
    scope: "payment",
    event,
    ...redact(meta),
    error: err
      ? { name: err.name, code: err.code, status: err.status, message: err.message }
      : undefined,
  });
  console.error(line);
}

module.exports = { logPaymentEvent, logPaymentWarning, logPaymentError };
