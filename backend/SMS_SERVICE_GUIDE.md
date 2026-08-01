# SMS Service - ملی‌پیامک (بروز‌رسانی شده)

## 📋 خلاصه تغییرات

سرویس SMS بروز‌رسانی شد تا از **SDK رسمی ملی‌پیامک** استفاده کند و از **Username/Password** برای احراز هویت پشتیبانی کند.

## 🔧 تغییرات انجام‌شده

### 1. **نصب SDK ملی‌پیامک**
```bash
npm install melipayamak
```

### 2. **بروز‌رسانی smsService.js**
- جایگزینی axios و Token API با SDK رسمی
- استفاده از Username و Password به‌جای Token
- بهینه‌سازی مدیریت خطاهای API
- بهتر‌سازی logging

### 3. **اضافه‌کردن جدول `sms_logs`**
جدول جدیدی در دیتابیس اضافه شد برای ثبت تمام پیامک‌های ارسالی:

```sql
CREATE TABLE sms_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    message LONGTEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    reservation_id INT,
    status ENUM('SENT','FAILED','PENDING') DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (reservation_id) REFERENCES bookings(id) ON DELETE SET NULL,
    INDEX idx_phone (phone),
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);
```

## ⚙️ تنظیمات محیطی (.env)

```env
# ملی‌پیامک - استفاده از Username و Password
MELIPAYAMAK_USERNAME=9127910503
MELIPAYAMAK_PASSWORD=2e2411ab-7c95-45f0-9b8d-249578b3215c
MELIPAYAMAK_SENDER=هتل_باغ_سرهنگ
```

## 📱 API سرویس

### ارسال کد OTP
```javascript
const { sendOtp } = require('./src/services/smsService');

// ارسال کد OTP
const result = await sendOtp('09121234567', '123456');

// نتیجه:
// - شبیه‌سازی: { simulated: true, success: true }
// - موفق: { success: true, simulated: false, recId: '...' }
// - خطا: { success: false, simulated: false, error: '...' }
```

### ارسال تأیید رزرو
```javascript
const { sendReservationConfirmed } = require('./src/services/smsService');

const result = await sendReservationConfirmed({
  phone: '09121234567',
  guestName: 'احمد محمدی',
  reservationNumber: 'RES-001',
  roomName: 'اتاق دو تخته',
  checkIn: '2026-01-15',
  checkOut: '2026-01-17',
  nights: 2,
  totalPrice: 5000000,
  reservationId: 1
});
```

### ارسال تأیید پرداخت
```javascript
const { sendPaymentConfirmed } = require('./src/services/smsService');

const result = await sendPaymentConfirmed({
  phone: '09121234567',
  reservationNumber: 'RES-001',
  totalPrice: 5000000,
  reservationId: 1
});
```

### ارسال اطلاع Check-In
```javascript
const { sendCheckInSms } = require('./src/services/smsService');

const result = await sendCheckInSms({
  phone: '09121234567',
  reservationNumber: 'RES-001',
  roomName: 'اتاق دو تخته',
  reservationId: 1
});
```

### ارسال اطلاع Check-Out
```javascript
const { sendCheckOutSms } = require('./src/services/smsService');

const result = await sendCheckOutSms({
  phone: '09121234567',
  reservationNumber: 'RES-001',
  reservationId: 1
});
```

## 🧪 تست

برای تست سرویس:
```bash
cd backend
npm run dev
# در ترمینال دیگری:
node test-sms.js
```

## 📊 وضعیت پیامک‌ها

همه پیامک‌ها در جدول `sms_logs` ثبت می‌شوند:
- `SENT`: پیامک موفقیت‌آمیز ارسال شد
- `FAILED`: ارسال ناموفق
- `PENDING`: در انتظار بررسی

## 🔐 مدیریت اعتبaragements

| وضعیت | توضیح |
|------|-------|
| ✓ | Username و Password دارید |
| ✓ | SDK نصب شده |
| ✓ | جدول sms_logs ایجاد شد |
| ✓ | .env بروز‌رسانی شد |

## 🚨 خطایافت شناخت‌شده

| کد خطا | معنی | راه‌حل |
|--------|-------|--------|
| 0 | خطا | بررسی Username/Password |
| -1 | خطا | بررسی اعتبار حساب |
| عدد مثبت | موفق | رقم ثبت‌نامی برای پیامک |

## 📞 پشتیبانی

برای مشکلات ملی‌پیامک:
- وب‌سایت: https://www.melipayamak.com
- پشتیبانی: 02163404
