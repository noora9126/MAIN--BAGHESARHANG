import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, BedDouble, Users, Calendar, ChevronLeft, ShieldCheck, MessageSquareText,
  CheckCircle2, CreditCard, Loader2, ArrowRight, Phone, MapPin,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import JalaliDatePicker from '../components/JalaliDatePicker';
import { hotelInfo } from '../data/hotel';
import { rooms as staticRooms } from '../data/rooms';
import { useBooking } from '../context/BookingContext';
import {
  getRooms, createReservation, requestOtp, verifyOtp, attachPhone,
  requestPayment, manualConfirmPayment, apiError, type Room,
} from '../services/api';
import { jalaliFriendly, formatToman, faNum, nightsBetween, todayStr, addDaysStr } from '../utils/dates';
import { toEnDigits, toFaDigits, isValidNationalId, isValidPersianName, isValidEmail } from '../utils/validation';

const STEPS = [
  { n: 1, label: 'انتخاب اتاق و تاریخ' },
  { n: 2, label: 'اطلاعات مسافر' },
  { n: 3, label: 'تأیید شماره' },
  { n: 4, label: 'پرداخت' },
];

interface FieldErrors {
  name?: string;
  email?: string;
  nationalId?: string;
}

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-10 flex-wrap">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex items-center gap-1 sm:gap-2">
          <div
            className={`flex items-center gap-2 rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold transition-all ${
              step === s.n
                ? 'bg-forest-600 text-white shadow-lg shadow-forest-600/30'
                : step > s.n
                  ? 'bg-forest-100 text-forest-600'
                  : 'bg-white text-forest-400 border border-forest-100'
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                step === s.n ? 'bg-white/20' : step > s.n ? 'bg-forest-600 text-white' : 'bg-forest-50 text-forest-400'
              }`}
            >
              {step > s.n ? <CheckCircle2 size={12} /> : faNum(s.n)}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 w-4 sm:w-8 rounded ${step > s.n ? 'bg-forest-400' : 'bg-forest-100'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function ReservationPage() {
  const { booking, setBooking, resetBooking } = useBooking();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // ─────────── OTP state ───────────
  const [phoneInput, setPhoneInput] = useState(booking.phone);
  const [otpSession, setOtpSession] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevCode, setOtpDevCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);

  // ─────────── payment state ───────────
  const [payMode, setPayMode] = useState<'gateway' | 'manual' | null>(null);

  // ─────────── field validation state ───────────
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const clearFieldError = (key: keyof FieldErrors) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  useEffect(() => {
    getRooms()
      .then((r) => {
        if (r.length > 0) {
          setRooms(r);
        } else {
          setRooms(staticRooms as unknown as Room[]);
        }
      })
      .catch(() => setRooms(staticRooms as unknown as Room[]))
      .finally(() => setLoadingRooms(false));
  }, []);

  useEffect(() => {
    if (otpTimer <= 0) return;
    const t = setInterval(() => setOtpTimer((x) => x - 1), 1000);
    return () => clearInterval(t);
  }, [otpTimer]);

  const selectRoom = (room: Room) => {
    setError('');
    setBooking({ room, checkIn: undefined, checkOut: undefined, nights: 0, step: 1 });
    window.scrollTo({ top: document.getElementById('date-picker')?.offsetTop ?? 0, behavior: 'smooth' });
  };

  const continueToStep2 = () => {
    if (!booking.room || !booking.checkIn || !booking.checkOut) {
      setError('اتاق و تاریخ‌ها را انتخاب کنید');
      return;
    }
    if (nightsBetween(booking.checkIn, booking.checkOut) < 1) {
      setError('تاریخ خروج باید بعد از تاریخ ورود باشد');
      return;
    }
    setError('');
    setBooking({ step: 2 });
    window.scrollTo(0, 0);
  };

  const submitGuestInfo = async () => {
    const errors: FieldErrors = {};

    if (!isValidPersianName(booking.guestName)) {
      errors.name = 'نام و نام خانوادگی را کامل و به فارسی وارد کنید';
    }

    if (!isValidEmail(booking.guestEmail)) {
      errors.email = 'ایمیل معتبر وارد کنید';
    }

    if (!isValidNationalId(booking.nationalId)) {
      errors.nationalId = 'کد ملی معتبر وارد کنید (کد ملی ۱۰ رقمی خود را بررسی کنید)';
    }

    setFieldErrors(errors);
    if (errors.name || errors.email || errors.nationalId) return;

    setError('');
    setBusy(true);
    try {
      const { reservation } = await createReservation({
        roomId: booking.room!.id,
        checkIn: booking.checkIn!,
        checkOut: booking.checkOut!,
        numberOfGuests: booking.numberOfGuests,
        guestName: booking.guestName.trim(),
        guestEmail: booking.guestEmail.trim(),
        nationalId: booking.nationalId.trim(),
        specialRequests: booking.specialRequests,
      });
      setBooking({ reservation, step: 3 });
      window.scrollTo(0, 0);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    const phone = phoneInput.replace(/[\s-]/g, '');
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل معتبر وارد کنید (11 رقم، با 09 شروع شود)');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await requestOtp(phone);
      setOtpSession(res.sessionId);
      setOtpAttemptsLeft(res.maxAttempts);
      setOtpTimer(60);
      setPhoneInput(phone);
      if (res.devCode) {
        setOtpDevCode(res.devCode);
        setOtpCode(res.devCode);
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (!otpSession) return;
    if (!/^\d{6}$/.test(otpCode)) {
      setError('کد تأیید باید 6 رقم باشد');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const res = await verifyOtp(otpSession, otpCode);
      if (res.verified) {
        const reservation = booking.reservation!;
        await attachPhone(reservation.id, phoneInput);
        setBooking({ phone: phoneInput, phoneVerified: true, step: 4 });
        setOtpSession(null);
        setOtpCode('');
        window.scrollTo(0, 0);
      } else {
        setOtpAttemptsLeft(res.attemptsLeft ?? 0);
        setError(res.message || 'کد اشتباه است');
      }
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const startPayment = async () => {
    const reservation = booking.reservation!;
    setBusy(true);
    setError('');
    try {
      const res = await requestPayment(reservation.id);
      setPayMode(res.mode ?? null);
      if (res.mode === 'gateway' && res.paymentURL) {
        window.location.href = res.paymentURL;
        return;
      }
      // حالت دستی: تایید مستقیم
      await manualConfirmPayment(reservation.id);
      resetBooking();
      navigate(`/payment/result?status=OK&authority=manual&reservationId=${reservation.id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const room = booking.room;
  const nights = booking.checkIn && booking.checkOut ? nightsBetween(booking.checkIn, booking.checkOut) : 0;
  const totalPrice = room && nights ? room.pricePerNight * nights : 0;

  return (
    <div className="pt-20">
      {/* Header */}
      <section className="relative py-14 sm:py-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hotel/eghamat-14.jpg" alt="رزرو هتل باغ سرهنگ" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 to-forest-900/60" />
        </div>
        <div className="relative z-10 container-x px-4 text-center">
          <nav className="flex items-center justify-center gap-2 text-sm text-white/70 mb-4">
            <Link to="/" className="flex items-center gap-1 hover:text-white transition-colors">
              <Home size={14} />
              خانه
            </Link>
            <span>/</span>
            <span className="text-white">رزرو آنلاین</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white text-shadow-lg">رزرو آنلاین اتاق</h1>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-x max-w-5xl">
          <ScrollReveal>
            <StepBar step={booking.step} />
          </ScrollReveal>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center font-medium">
              {error}
            </div>
          )}

          {/* ═══════════ STEP 1: اتاق و تاریخ ═══════════ */}
          {booking.step === 1 && (
            <div className="space-y-6">
              {loadingRooms && <p className="text-center text-forest-500 py-10">در حال دریافت اتاق‌ها...</p>}
              <div className="grid gap-6 sm:grid-cols-2">
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRoom(r)}
                    className={`group text-right overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                      room?.id === r.id ? 'ring-4 ring-gold-400' : ''
                    }`}
                  >
                    <div className="relative h-44">
                      <img src={r.images?.[0] || r.image || '/images/hotel/eghamat-05.jpg'} alt={r.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-forest-700">
                        {formatToman(r.pricePerNight)}
                        <span className="text-xs text-forest-400 font-normal"> / شب</span>
                      </span>
                      {r.popular && (
                        <span className="absolute top-3 left-3 rounded-full bg-gold-500 px-3 py-1 text-xs font-bold text-forest-900">محبوب</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-forest-800">{r.name}</h3>
                        {room?.id === r.id && <CheckCircle2 className="text-gold-500" size={20} />}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-forest-500">
                        <span className="flex items-center gap-1"><Users size={14} /> {faNum(r.capacity)} نفر</span>
                        {r.area && <span className="flex items-center gap-1"><MapPin size={14} /> {r.area}</span>}
                        {r.amenities?.length ? (
                          <span className="flex items-center gap-1"><BedDouble size={14} /> {r.amenities.slice(0, 3).join('، ')}</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {room && (
                <div id="date-picker" className="rounded-2xl bg-white p-6 sm:p-8 shadow-lg border border-forest-50">
                  <h3 className="text-lg font-black text-forest-800 mb-5 flex items-center gap-2">
                    <Calendar className="text-gold-500" size={20} />
                    {room.name} — انتخاب تاریخ اقامت
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">تاریخ ورود (شمسی)</span>
                      <JalaliDatePicker
                        value={booking.checkIn}
                        min={todayStr()}
                        onChange={(iso) => {
                          const checkOut =
                            booking.checkOut && nightsBetween(iso, booking.checkOut) < 1 ? undefined : booking.checkOut;
                          setBooking({ checkIn: iso, checkOut });
                        }}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">تاریخ خروج (شمسی)</span>
                      <JalaliDatePicker
                        value={booking.checkOut}
                        min={booking.checkIn ? addDaysStr(booking.checkIn, 1) : todayStr()}
                        onChange={(iso) => setBooking({ checkOut: iso })}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">تعداد مهمان</span>
                      <select
                        value={booking.numberOfGuests}
                        onChange={(e) => setBooking({ numberOfGuests: Number(e.target.value) })}
                        className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                      >
                        {Array.from({ length: room.capacity + (room.extraCapacity || 0) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{faNum(n)} نفر</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {booking.checkIn && booking.checkOut && nights >= 1 && (
                    <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl bg-gold-50 px-5 py-4">
                      <div className="flex items-center gap-3 text-sm text-forest-700">
                        <span>{jalaliFriendly(booking.checkIn)}</span>
                        <ChevronLeft size={16} className="text-gold-500" />
                        <span>{jalaliFriendly(booking.checkOut)}</span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-forest-500">
                          {faNum(nights)} شب
                        </span>
                      </div>
                      <p className="font-black text-forest-800">
                        مجموع: <span className="text-gold-600">{formatToman(totalPrice)}</span>
                      </p>
                    </div>
                  )}

                  <button onClick={continueToStep2} className="btn-gold w-full mt-5">
                    ادامه <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ STEP 2: اطلاعات مسافر ═══════════ */}
          {booking.step === 2 && room && (
            <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-lg">
              <div className="mb-6 flex items-center justify-between rounded-xl bg-forest-50 px-5 py-4">
                <div>
                  <p className="font-black text-forest-800">{room.name}</p>
                  <p className="text-xs text-forest-500">
                    {jalaliFriendly(booking.checkIn!)} ← {jalaliFriendly(booking.checkOut!)} — {faNum(nights)} شب — {faNum(booking.numberOfGuests)} نفر
                  </p>
                </div>
                <p className="font-black text-gold-600">{formatToman(totalPrice)}</p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-forest-600">نام و نام خانوادگی *</span>
                  <input
                    type="text"
                    value={booking.guestName}
                    onChange={(e) => {
                      setBooking({ guestName: e.target.value });
                      clearFieldError('name');
                    }}
                    placeholder="مثال: محمد احمدی"
                    className={`w-full rounded-xl border bg-forest-50/50 px-4 py-3 text-forest-800 outline-none focus:ring-2 ${
                      fieldErrors.name
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : 'border-forest-200 focus:border-gold-400 focus:ring-gold-200'
                    }`}
                  />
                  {fieldErrors.name && (
                    <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.name}</span>
                  )}
                </label>
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-forest-600">کد ملی *</span>
                  <input
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    maxLength={10}
                    value={booking.nationalId}
                    onChange={(e) => {
                      setBooking({ nationalId: toEnDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 10) });
                      clearFieldError('nationalId');
                    }}
                    placeholder="کد ۱۰ رقمی"
                    className={`w-full rounded-xl border bg-forest-50/50 px-4 py-3 text-forest-800 text-center tracking-widest font-bold outline-none focus:ring-2 ${
                      fieldErrors.nationalId
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : booking.nationalId.length === 10
                          ? isValidNationalId(booking.nationalId)
                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-100'
                            : 'border-red-400 focus:border-red-400 focus:ring-red-100'
                          : 'border-forest-200 focus:border-gold-400 focus:ring-gold-200'
                    }`}
                  />
                  {booking.nationalId.length === 10 && isValidNationalId(booking.nationalId) && (
                    <span className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={13} /> کد ملی معتبر است
                    </span>
                  )}
                  {fieldErrors.nationalId && (
                    <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.nationalId}</span>
                  )}
                </label>
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-forest-600">ایمیل *</span>
                  <input
                    type="email"
                    dir="ltr"
                    value={booking.guestEmail}
                    onChange={(e) => {
                      setBooking({ guestEmail: e.target.value });
                      clearFieldError('email');
                    }}
                    placeholder="email@example.com"
                    className={`w-full rounded-xl border bg-forest-50/50 px-4 py-3 text-forest-800 text-left outline-none focus:ring-2 ${
                      fieldErrors.email
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
                        : 'border-forest-200 focus:border-gold-400 focus:ring-gold-200'
                    }`}
                  />
                  {fieldErrors.email && (
                    <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.email}</span>
                  )}
                </label>
                <label className="block sm:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-forest-600">شماره موبایل *</span>
                  <input
                    type="tel"
                    dir="ltr"
                    inputMode="numeric"
                    disabled
                    value={booking.phone ? toFaDigits(booking.phone) : 'در مرحله بعد تأیید می‌شود'}
                    className="w-full cursor-not-allowed rounded-xl border border-forest-100 bg-forest-100/40 px-4 py-3 text-forest-600 text-left outline-none"
                  />
                  <span className="mt-1.5 block text-xs text-forest-400">شماره موبایل در مرحله بعد با کد تأیید اثبات می‌شود</span>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-forest-600">درخواست ویژه (اختیاری)</span>
                  <textarea
                    value={booking.specialRequests}
                    onChange={(e) => setBooking({ specialRequests: e.target.value })}
                    rows={3}
                    placeholder="مثلاً: اتاق نزدیک راه‌پله، تخت اضافه، ..."
                    className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
                <button onClick={() => setBooking({ step: 1 })} className="btn-outline flex-1">بازگشت</button>
                <button onClick={submitGuestInfo} disabled={busy} className="btn-gold flex-1">
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                  ادامه و تأیید شماره
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP 3: تأیید شماره ═══════════ */}
          {booking.step === 3 && (
            <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-lg max-w-xl mx-auto">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
                <MessageSquareText className="text-gold-600" size={32} />
              </div>
              <h3 className="text-center text-xl font-black text-forest-800 mb-2">تأیید شماره موبایل</h3>
              <p className="mb-6 text-center text-sm text-forest-500 leading-relaxed">
                یک کد ۶ رقمی به شماره شما پیامک می‌شود. این کد <b>۱۰ دقیقه</b> معتبر است.
              </p>

              {!otpSession ? (
                <>
                  <label className="block mb-4">
                    <span className="mb-1.5 block text-sm font-medium text-forest-600">شماره موبایل *</span>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        dir="ltr"
                        inputMode="numeric"
                        maxLength={11}
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="09121234567"
                        className="flex-1 rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-forest-800 text-left outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                      />
                    </div>
                  </label>
                  <button onClick={sendOtp} disabled={busy || otpTimer > 0} className="btn-gold w-full">
                    {busy ? <Loader2 className="animate-spin" size={18} /> : <MessageSquareText size={18} />}
                    {otpTimer > 0 ? `ارسال مجدد تا ${faNum(otpTimer)} ثانیه دیگر` : 'ارسال کد تأیید'}
                  </button>
                  {otpDevCode && (
                    <p className="mt-3 rounded-lg bg-forest-50 px-4 py-2 text-center text-xs text-forest-600">
                      حالت تستی (بدون API کی): کد پیامک: <b dir="ltr">{faNum(otpDevCode)}</b>
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label className="block mb-4">
                    <span className="mb-1.5 block text-sm font-medium text-forest-600">
                      کد تأیید ارسال‌شده به <b dir="ltr">{phoneInput}</b>
                    </span>
                    <input
                      type="tel"
                      dir="ltr"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="------"
                      className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                    />
                  </label>
                  <p className="mb-4 text-center text-xs text-forest-400">
                    {faNum(otpAttemptsLeft)} تلاش باقی مانده
                  </p>
                  <button onClick={submitOtp} disabled={busy} className="btn-gold w-full">
                    {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                    تأیید شماره
                  </button>
                  <button
                    onClick={() => setOtpSession(null)}
                    className="mt-3 w-full text-center text-xs text-forest-500 hover:text-forest-700 underline"
                  >
                    تغییر شماره
                  </button>
                </>
              )}
            </div>
          )}

          {/* ═══════════ STEP 4: پرداخت ═══════════ */}
          {booking.step === 4 && booking.reservation && (
            <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-lg max-w-xl mx-auto">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-forest-100">
                <CheckCircle2 className="text-forest-600" size={32} />
              </div>
              <h3 className="text-center text-xl font-black text-forest-800 mb-1">شماره شما تأیید شد!</h3>
              <p className="mb-6 text-center text-sm text-forest-500">
                خلاصه رزرو شما: <b dir="ltr">{booking.reservation.reservation_number}</b>
              </p>

              <div className="space-y-3 rounded-xl bg-forest-50/60 p-5 text-sm">
                <div className="flex justify-between"><span className="text-forest-500">اتاق</span><b className="text-forest-800">{room?.name}</b></div>
                <div className="flex justify-between">
                  <span className="text-forest-500">ورود / خروج</span>
                  <b className="text-forest-800">{jalaliFriendly(booking.reservation.check_in)} ← {jalaliFriendly(booking.reservation.check_out)}</b>
                </div>
                <div className="flex justify-between"><span className="text-forest-500">تعداد شب</span><b className="text-forest-800">{faNum(nights)} شب</b></div>
                <div className="flex justify-between"><span className="text-forest-500">مهمانان</span><b className="text-forest-800">{faNum(booking.numberOfGuests)} نفر</b></div>
                <div className="flex justify-between"><span className="text-forest-500">نام مسافر</span><b className="text-forest-800">{booking.guestName}</b></div>
                {booking.nationalId && (
                  <div className="flex justify-between">
                    <span className="text-forest-500">کد ملی</span>
                    <b className="text-forest-800" dir="ltr">{toFaDigits(booking.nationalId)}</b>
                  </div>
                )}
                <div className="flex justify-between border-t border-forest-100 pt-3">
                  <span className="font-bold text-forest-600">مبلغ قابل پرداخت</span>
                  <b className="text-gold-600 text-lg">{formatToman(totalPrice)}</b>
                </div>
              </div>

              {payMode === 'manual' && (
                <p className="mt-4 rounded-lg bg-forest-50 px-4 py-2 text-center text-xs text-forest-600">
                  پرداخت در حالت تستی با موفقیت انجام شد.
                </p>
              )}

              <button onClick={startPayment} disabled={busy} className="btn-gold w-full mt-6">
                {busy ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
                پرداخت آنلاین
              </button>
              <button
                onClick={() => setBooking({ step: 3 })}
                className="mt-3 w-full text-center text-xs text-forest-500 hover:text-forest-700 underline"
              >
                بازگشت به تأیید شماره
              </button>
            </div>
          )}
        </div>
      </section>

      {/* کادر تلفنی */}
      <section className="pb-16 px-4">
        <div className="container-x max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-forest-800 p-6 sm:p-8 text-white">
            <div>
              <p className="font-black text-lg mb-1">رزرو تلفنی هم در دسترس است</p>
              <p className="text-sm text-white/70">پذیرش ۲۴ ساعته — پاسخگویی سریع</p>
            </div>
            <a href={`tel:${hotelInfo.phone}`} className="btn-gold shrink-0">
              <Phone size={18} />
              <span dir="ltr">{hotelInfo.phone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
