# 🚀 راهنمای انتقال سایت به هاست (Production)

این پروژه دو بخش دارد: **backend** (Node.js + MySQL) و **project** (فرانت React).
پرداخت کارت‌به‌کارت واریزا کامل نصب و تست شده؛ فقط باید این مراحل را روی هاست انجام دهی.

---

## پیش‌نیاز هاست

- هاست با قابلیت **Node.js** (سی‌پنل/دایرکت‌ادمین با Node Selector، یا VPS)
- دیتابیس **MySQL**
- **SSL (https)** فعال روی دامنه — الزامیِ واریزا (اجباری، بدون این کار نمی‌کند)

---

## مرحله ۱ — دیتابیس

1. در هاست یک دیتابیس MySQL + یوزر بساز
2. فایل‌های پوشه `backend` را آپلود کن (پوشه `node_modules` را آپلود نکن!)
3. در پوشه backend:
```bash
npm install --omit=dev
npm run setup     # ساخت جداول
npm run seed      # ساخت اتاق‌ها و ادمین اولیه
```

---

## مرحله ۲ — فایل backend/.env روی هاست

```env
PORT=5000
NODE_ENV=production

DB_HOST=localhost
DB_USER=یوزر-دیتابیس-هاست
DB_PASSWORD=رمز-دیتابیس
DB_NAME=نام-دیتابیس

JWT_SECRET=یک-رشته-طولانی-تصادفی-حداقل-۳۲-کاراکتر

# ⚠️ دامنه واقعی با https — واریزا فقط https قبول می‌کند
FRONTEND_URL=https://دامنه-شما.ir

# کلیدهای واریزا (همان که لوکال جواب داد)
VARIZA_API_KEY=کلید-فعلی-تو
VARIZA_WEBHOOK_SECRET=سیکرت-فعلی-تو
VARIZA_LINK_EXPIRY=1h
VARIZA_AMOUNT_TOLERANCE_PERCENT=5

# پیامک واقعی فعال باشد
SMS_SIMULATE=0
```

⚠️ **هرگز** `ENABLE_MANUAL_PAYMENT_CONFIRM=1` نگذار — مسیر تقلبی را باز می‌کند.

---

## مرحله ۳ — اجرای بک‌اند

با PM2 (روی VPS) یا گزینه «Start app» سی‌پنل:

```bash
npm install -g pm2      # اگر VPS است
pm2 start server.js --name baghsarhang-api
pm2 save
```

چک کن: باز کن `https://دامنه-شما.ir/api/payments/variza/config-status`
باید ببینی: `"configured": true`

---

## مرحله ۴ — فرانت‌اند

1. در `project/.env`:
```env
VITE_API_URL=https://دامنه-شما.ir
```
2. روی سیستم خودت build بگیر:
```bash
npm run build
```
3. محتویات پوشه `project/dist` را در ریشه دامنه هاست آپلود کن.

---

## مرحله ۵ — اتصال دامنه به بک‌اند

باید آدرس‌های `/api/...` به پورت Node برسند.

**Nginx (VPS):**
```nginx
server {
    server_name دامنه-شما.ir;
    ssl_certificate     /path/fullchain.pem;
    ssl_certificate_key /path/privkey.pem;

    root /path/to/project/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

**سی‌پنل:** از بخش Setup Node.js App، همان دامنه را به اپلیکیشن وصل کن و فایل‌های dist فرانت را در مسیر public_html بگذار (با فایل `.htaccess` ریدایرکت `/api` به پورت Node).

---

## مرحله ۶ — پنل واریزا (مهم!)

در پروفایل واریزا، callback_url باید **دقیقاً** دامنه اصلی باشد:

```
https://دامنه-شما.ir/api/payments/variza/webhook
```

اگر موقع لوکال چیز دیگری ثبت کرده‌ای (مثل ngrok)، الان آن را به دامنه اصلی تغییر بده.

---

## مرحله ۷ — تست نهایی با پول واقعی

1. یک رزرو کم‌قیمت بساز → «پرداخت کارت‌به‌کارت» → باید به صفحه variza.ir بروی
2. همان مبلغ را کارت‌به‌کارت واریز کن
3. تا چند ثانیه بعد: برگشت خودکار به سایت + سفارش Paid + پیامک تأیید
4. در پنل مدیریت (Finance) تراکنش را ببین

---

## ⚠️ سه خطای رایج و حلشان

| خطا | علت | حل |
|---|---|---|
| «درگاه پرداخت درخواست را نپذیرفت» | callback_url ثبت نشده یا FRONTEND_URL با http است | مرحله ۶ و مرحله ۲ |
| لینک ساخته می‌شود ولی سفارش Paid نمی‌شود | callback_url اشتباه است؛ وب‌هوک جای دیگری می‌رود | مرحله ۶ — آدرس دقیق webhook |
| صفحه سفید بعد از آپلود فرانت | VITE_API_URL غلط یا build قدیمی | مرحله ۴ |

---

## 🔒 امنیت قبل از اولین push

فایل‌های `.env` متأسفانه از قبل در Git track شده‌اند. قبل از انتشار کد:

```bash
git rm --cached backend/.env project/.env
git commit -m "stop tracking env files"
```

و رمز ادمین پیش‌فرض seed را بعد از اولین ورود عوض کن.
