const app = require("./src/app");
require("./src/config/db");
const { saveSettingsFromDb } = require("./src/services/zarinpalService");
const {
  varizaConfigured,
  apiKeyConfigured,
  webhookSecretConfigured,
} = require("./src/services/varizaService");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const PORT = process.env.PORT || 5000;

// اعمال تنظیمات ذخیره‌شده (زرین‌پال و ملی‌پیامک) در شروع سرور
saveSettingsFromDb();

// وضعیت درگاه واریزا در شروع — بدون نمایش هیچ مقداری
if (varizaConfigured()) {
  console.log("✅ Variza gateway: API_KEY ✓ | WEBHOOK_SECRET ✓");
} else {
  console.warn(
    "\n⚠️  درگاه پرداخت کارت‌به‌کارت واریزا فعال نیست!\n" +
      `   VARIZA_API_KEY: ${apiKeyConfigured() ? "✓ تنظیم شده" : "✗ خالی"}\n` +
      `   VARIZA_WEBHOOK_SECRET: ${webhookSecretConfigured() ? "✓ تنظیم شده" : "✗ خالی"}\n` +
      "   هر دو را در backend/.env وارد کنید و سرور را ری‌استارت کنید.\n" +
      "   (کلیدها از پنل variza.ir ← پروفایل ← کلید API)\n"
  );
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
