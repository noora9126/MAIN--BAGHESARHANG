// فایل تست برای سرویس SMS
require("dotenv").config();
const smsService = require("./src/services/smsService");

async function testOtp() {
  console.log("🧪 تست سرویس OTP ملی‌پیامک...");
  console.log("━".repeat(50));
  
  // بررسی محیط‌های داخلی
  console.log("\n📋 تنظیمات:");
  console.log(`Username: ${process.env.MELIPAYAMAK_USERNAME ? "✓ تنظیم شده" : "✗ تنظیم نشده"}`);
  console.log(`Password: ${process.env.MELIPAYAMAK_PASSWORD ? "✓ تنظیم شده" : "✗ تنظیم نشده"}`);
  console.log(`Sender: ${process.env.MELIPAYAMAK_SENDER || "پیش‌فرض"}`);
  
  // بررسی فعال‌بودن سرویس
  const enabled = smsService.smsEnabled();
  console.log(`\nوضعیت ملی‌پیامک: ${enabled ? "✓ فعال" : "⚠️ غیرفعال (شبیه‌سازی)"}`);
  console.log("━".repeat(50));
  
  // تست ارسال کد OTP
  console.log("\n📱 تست ارسال کد OTP به 09121111111...");
  try {
    const result = await smsService.sendOtp("09121111111", "123456");
    console.log("✓ نتیجه:");
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("✗ خطا:", err.message);
  }
  
  console.log("\n━".repeat(50));
  console.log("✓ تست کامل شد");
}

testOtp().catch(console.error);
