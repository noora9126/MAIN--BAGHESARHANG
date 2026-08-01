const app = require("./src/app");
require("./src/config/db");
const { saveSettingsFromDb } = require("./src/services/zarinpalService");

const PORT = process.env.PORT || 5000;

// اعمال تنظیمات ذخیره‌شده (زرین‌پال و ملی‌پیامک) در شروع سرور
saveSettingsFromDb();

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
