/*
 * ابزار تشخیص — چرا واریزا درخواست را 422 رد می‌کند؟
 * اجرا:  node tests/variza-api-diagnose.js
 * با کلید واقعی .env دو درخواست واقعی به API واریزا می‌زند و پاسخ کامل را نشان می‌دهد.
 * ⚠️ کلید هرگز چاپ نمی‌شود؛ فقط پاسخ سرور واریزا.
 */
require("dotenv").config();
const axios = require("axios");

const KEY = String(process.env.VARIZA_API_KEY || "").trim().replace(/^["']+|["']+$/g, "");
if (!KEY) {
  console.error("❌ VARIZA_API_KEY خالی است");
  process.exit(1);
}

async function call(label, payload) {
  try {
    const res = await axios.post("https://variza.ir/api/v1/pay", payload, {
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      timeout: 20000,
      validateStatus: null,
    });
    console.log(`\n=== ${label} ===`);
    console.log(`HTTP ${res.status}`);
    console.log(JSON.stringify(res.data, null, 2));
    return res;
  } catch (err) {
    console.log(`\n=== ${label} ===`);
    console.log("NETWORK/TIMEOUT ERROR:", err.code || err.message);
    return null;
  }
}

(async () => {
  console.log("تشخیص خطای 422 واریزا...\n");

  // تست ۱: return_url با HTTPS استاندارد → اگر این هم 422 داد، مشکل از پنل است
  // (callback_url ثبت نشده / کارت مقصد غیرفعال / محدودیت پلن)، نه از return_url ما
  const r1 = await call("تست ۱: return_url=https (استاندارد)", {
    amount: 50000,
    return_url: "https://example.com/payment/result",
    title: "Diagnose #1",
    expires_in: "30m",
  });

  // تست ۲: همان چیزی که سایت لوکال می‌فرستد (http://localhost) → انتظار 422 داریم
  const r2 = await call("تست ۲: return_url=http://localhost (شبیه‌سازی لوکال)", {
    amount: 50000,
    return_url: "http://localhost:5174/payment/result",
    title: "Diagnose #2",
    expires_in: "30m",
  });

  console.log("\n─────────── جمع‌بندی ───────────");
  if (r1 && r1.status >= 200 && r1.status < 300) {
    console.log("✅ تست ۱ موفق شد → اتصال و کلید سالم است.");
    console.log("   پس مشکل سایت شما فقط return_url غیر HTTPS در حالت لوکال است (تست ۲).");
    console.log("   لینک ساخته‌شده تست ۱ را می‌توانید نادیده بگیرید؛ بعد از ۳۰ دقیقه خودکار منقضی می‌شود.");
  } else if (r1 && r1.status === 422) {
    console.log("❌ حتی با return_url استاندارد هم 422 می‌دهد → مشکل از تنظیمات پنل واریزاست:");
    console.log("   - ثبت callback_url در پروفایل (الزامي)");
    console.log("   - تأیید شدن حساب بانکی/کارت مقصد");
    console.log("   - محدودیت تعداد لینک فعال در پلن رایگان");
  }
  process.exit(0);
})();
