import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home, BedDouble, Users, Calendar, ChevronLeft, ShieldCheck, MessageSquareText,
  CheckCircle2, CreditCard, Loader2, ArrowRight, Phone, MapPin, UserPlus, Baby, BadgeCheck,
} from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import JalaliDatePicker, { type BlockedStatus } from '../components/JalaliDatePicker';
import { hotelInfo } from '../data/hotel';
import { rooms as staticRooms } from '../data/rooms';
import { useBooking } from '../context/BookingContext';
import {
  getRooms, createReservation, requestOtp, verifyOtp, attachPhone,
  requestPayment, manualConfirmPayment, getRoomAvailability, validateDiscountCode, apiError, type Room,
} from '../services/api';
import { jalaliFriendly, formatToman, faNum, nightsBetween, todayStr, addDaysStr } from '../utils/dates';
import { toEnDigits, toFaDigits, isValidNationalId, isValidPersianName, isValidEmail } from '../utils/validation';

const STEPS = [
  { n: 1, label: 'انتخاب اتاق و تاریخ' },
  { n: 2, label: 'اطلاعات مسافر' },
  { n: 3, label: 'تأیید شماره' },
  { n: 4, label: 'پرداخت' },
];

// گروه‌های سنی کودک بر اساس دستورالعمل رسمی تأسیسات گردشگری
const CHILD_GROUPS = [
  { label: 'زیر ۲ سال (رایگان)', value: 0 },
  { label: '۲ تا ۱۲ سال (نیم‌بها)', value: 2 },
  { label: 'بالای ۱۲ سال (بها کامل)', value: 13 },
];

interface FieldErrors {
  name?: string;
  email?: string;
  nationalId?: string;
  guests?: string;
  total?: string;
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

// ─────────────── محاسبه قیمت بر اساس سرانه ───────────────
// هر بزرگسال: قیمت اتاق × شب‌ها / کودک زیر ۲ سال رایگان / ۲ تا ۱۲ سال نیم‌بها / بالای ۱۲ سال کامل
function calcStayPrice(room: Room, nights: number, adults: number, _children: number, childAges: number[]) {
  const p = room.pricePerNight;
  const adultTotal = adults * p * nights;
  const childLines = childAges.map((age) => ({
    age,
    rate: age < 2 ? 0 : age <= 12 ? Math.round(p / 2) : p,
    total: (age < 2 ? 0 : age <= 12 ? Math.round(p / 2) : p) * nights,
  }));
  const childTotal = childLines.reduce((s, l) => s + l.total, 0);
  return { adultTotal, childLines, childTotal, total: adultTotal + childTotal };
}

export default function ReservationPage() {
  const { booking, setBooking, resetBooking } = useBooking();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ─────────── وضعیت رزروشده هر روز (برای قرمز شدن تقویم) ───────────
  const [blockedDates, setBlockedDates] = useState<Record<string, BlockedStatus>>({});

  // ─────────── OTP state ───────────
  const [phoneInput, setPhoneInput] = useState(booking.phone);
  const [otpSession, setOtpSession] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpDevCode, setOtpDevCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);

  // ─────────── payment state ───────────
  const [payMode, setPayMode] = useState<'gateway' | 'manual' | null>(null);

  // ─────────── discount state ───────────
  const [discountCode, setDiscountCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState<{ code: string; percent: number; amount: number; reason?: string | null } | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountChecking, setDiscountChecking] = useState(false);

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
    setDiscountInfo(null);
    setDiscountError('');
    setBooking({ room, checkIn: undefined, checkOut: undefined, nights: 0, step: 1 });
    setBlockedDates({});
    getRoomAvailability(room.id, todayStr(), addDaysStr(todayStr(), 370))
      .then((dates) => {
        const map: Record<string, BlockedStatus> = {};
        for (const d of dates) map[d.date] = d.status;
        setBlockedDates(map);
      })
      .catch(() => setBlockedDates({}));
    window.scrollTo({ top: document.getElementById('date-picker')?.offsetTop ?? 0, behavior: 'smooth' });
  };

  // ─────────── مدیریت مسافران (بزرگسال/کودک) ───────────
  const maxPersons = (booking.room?.capacity ?? 1) + (booking.room?.extraCapacity ?? 0);

  const setAdults = (n: number) => {
    const adults = Math.max(1, Math.min(n, maxPersons));
    const children = Math.max(0, Math.min(booking.numberOfChildren, maxPersons - adults));
    setBooking({
      numberOfAdults: adults,
      numberOfChildren: children,
      childAges: booking.childAges.slice(0, children),
    });
  };

  const setChildren = (n: number) => {
    const children = Math.max(0, Math.min(n, maxPersons - booking.numberOfAdults));
    setBooking({ numberOfChildren: children, childAges: booking.childAges.slice(0, children) });
  };

  const setChildAge = (index: number, value: number) => {
    const ages = [...booking.childAges];
    ages[index] = value;
    setBooking({ childAges: ages });
  };

  const setGuestRow = (index: number, patch: Partial<{ name: string; nationalId: string }>) => {
    const guests = booking.guests.map((g, i) => (i === index ? { ...g, ...patch } : g));
    setBooking({ guests });
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
    if (booking.numberOfAdults + booking.numberOfChildren > maxPersons) {
      setError(`ظرفیت این اتاق حداکثر ${maxPersons} نفر است`);
      return;
    }
    setError('');
    setBooking({ step: 2 });
    window.scrollTo(0, 0);
  };

  // ─────────── اعمال کد تخفیف (اعتبارسنجی واقعی روی سرور) ───────────
  const applyDiscount = async () => {
    const code = discountCode.trim();
    if (!code) {
      setDiscountError('کد تخفیف را وارد کنید');
      return;
    }
    if (!booking.room || !booking.checkIn || !booking.checkOut || !price) {
      setDiscountError('ابتدا اتاق و تاریخ‌ها را انتخاب کنید');
      return;
    }
    setDiscountChecking(true);
    setDiscountError('');
    try {
      const res = await validateDiscountCode({
        code,
        roomId: booking.room.id,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        numberOfAdults: booking.numberOfAdults,
        numberOfChildren: booking.numberOfChildren,
        childAges: booking.childAges,
      });
      setDiscountInfo(res.discount);
      setDiscountCode(res.discount.code);
      setDiscountError('');
    } catch (err) {
      setDiscountInfo(null);
      setDiscountError(apiError(err));
    } finally {
      setDiscountChecking(false);
    }
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

    const otherGuests = booking.guests;
    if (otherGuests.length !== booking.numberOfAdults - 1) {
      errors.guests = `لطفاً مشخصات ${faNum(Math.max(booking.numberOfAdults - 1, 0))} مهمان دیگر را کامل کنید`;
    } else {
      for (const g of otherGuests) {
        if (!isValidPersianName(g.name) || !isValidNationalId(g.nationalId)) {
          errors.guests = 'نام و کد ملی همه مهمانان را معتبر وارد کنید';
          break;
        }
      }
    }

    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setError('');
    setBusy(true);
    try {
      const { reservation, pricing } = await createReservation({
        roomId: booking.room!.id,
        checkIn: booking.checkIn!,
        checkOut: booking.checkOut!,
        numberOfAdults: booking.numberOfAdults,
        numberOfChildren: booking.numberOfChildren,
        childAges: booking.childAges,
        guests: otherGuests,
        guestName: booking.guestName.trim(),
        guestEmail: booking.guestEmail.trim(),
        nationalId: booking.nationalId.trim(),
        specialRequests: booking.specialRequests,
        discountCode: discountInfo ? discountInfo.code : undefined,
      });
      setBooking({
        reservation: {
          ...reservation,
          ...(pricing ? { total_price: pricing.totalPrice, price_per_night: pricing.adultPrice } : {}),
        },
        step: 3,
      });
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
      setOtpTimer(30);
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
  const price = useMemo(
    () =>
      room && nights
        ? calcStayPrice(room, nights, booking.numberOfAdults, booking.numberOfChildren, booking.childAges)
        : null,
    [room, nights, booking.numberOfAdults, booking.numberOfChildren, booking.childAges]
  );

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
                        <span className="text-xs text-forest-400 font-normal"> / نفر / شب</span>
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
                        <span className="flex items-center gap-1"><Users size={14} /> {faNum(r.capacity + (r.extraCapacity || 0))} نفر</span>
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
                  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-forest-50 px-4 py-3 text-[11px] text-forest-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-600 inline-block" /> رزرو قطعی (غیرقابل انتخاب)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" /> در انتظار پرداخت
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-forest-600 inline-block" /> خالی
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">تاریخ ورود (شمسی)</span>
                      <JalaliDatePicker
                        value={booking.checkIn}
                        min={todayStr()}
                        blocked={blockedDates}
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
                        blocked={blockedDates}
                        onChange={(iso) => setBooking({ checkOut: iso })}
                      />
                    </label>
                    <div className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">ترکیب مسافران</span>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <select
                            value={booking.numberOfAdults}
                            onChange={(e) => setAdults(Number(e.target.value))}
                            className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-3 py-3 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                          >
                            {Array.from({ length: maxPersons }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{faNum(n)} بزرگسال</option>
                            ))}
                          </select>
                          <p className="mt-1 text-[10px] text-forest-400">هر بزرگسال: {formatToman(room.pricePerNight)} / شب</p>
                        </div>
                        <div className="flex-1">
                          <select
                            value={booking.numberOfChildren}
                            onChange={(e) => setChildren(Number(e.target.value))}
                            className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-3 py-3 text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                          >
                            {Array.from({ length: maxPersons - booking.numberOfAdults + 1 }, (_, i) => i).map((n) => (
                              <option key={n} value={n}>{n === 0 ? 'بدون کودک' : faNum(n) + ' کودک'}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-[10px] text-forest-400">زیر ۲ سال رایگان / ۲ تا ۱۲ سال نیم‌بها</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {booking.numberOfChildren > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {Array.from({ length: booking.numberOfChildren }, (_, i) => i).map((i) => (
                        <label key={i} className="block">
                          <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-forest-600">
                            <Baby size={13} className="text-gold-500" /> سن کودک {faNum(i + 1)}
                          </span>
                          <select
                            value={booking.childAges[i] ?? 2}
                            onChange={(e) => setChildAge(i, Number(e.target.value))}
                            className="w-full rounded-xl border border-forest-200 bg-forest-50/50 px-3 py-2.5 text-sm text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                          >
                            {CHILD_GROUPS.map((g) => (
                              <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}

                  {booking.checkIn && booking.checkOut && nights >= 1 && price && (
                    <div className="mt-5 rounded-xl bg-gold-50 px-5 py-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-sm text-forest-700">
                          <span>{jalaliFriendly(booking.checkIn)}</span>
                          <ChevronLeft size={16} className="text-gold-500" />
                          <span>{jalaliFriendly(booking.checkOut)}</span>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-forest-500">
                            {faNum(nights)} شب
                          </span>
                        </div>
                        <p className="font-black text-forest-800">
                          {discountInfo ? (
                            <>
                              <span className="ml-2 line-through text-forest-400">{formatToman(price.total)}</span>
                              نهایی: <span className="text-gold-600">{formatToman(Math.max(0, price.total - discountInfo.amount))}</span>
                            </>
                          ) : (
                            <>
                              مجموع: <span className="text-gold-600">{formatToman(price.total)}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="mt-3 space-y-1 border-t border-gold-200/70 pt-3 text-xs text-forest-600">
                        <div className="flex justify-between">
                          <span>{faNum(booking.numberOfAdults)} بزرگسال × {formatToman(room.pricePerNight)} × {faNum(nights)} شب</span>
                          <b>{formatToman(price.adultTotal)}</b>
                        </div>
                        {price.childLines.map((l, i) => (
                          <div key={i} className="flex justify-between">
                            <span>
                              کودک {faNum(i + 1)} ({l.rate === 0 ? 'رایگان' : l.rate === Math.round(room.pricePerNight / 2) ? 'نیم‌بها' : 'کامل'})
                              {l.rate > 0 ? ` × ${faNum(nights)} شب` : ''}
                            </span>
                            <b>{l.total === 0 ? 'رایگان' : formatToman(l.total)}</b>
                          </div>
                        ))}
                        {discountInfo && (
                          <div className="flex justify-between border-t border-gold-200/70 pt-2 font-bold text-forest-700">
                            <span>
                              تخفیف ({discountInfo.code} — {faNum(discountInfo.percent)}٪)
                              {discountInfo.reason ? ` — ${discountInfo.reason}` : ''}
                            </span>
                            <b className="text-red-600">− {formatToman(discountInfo.amount)}</b>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* کد تخفیف */}
                  {booking.checkIn && booking.checkOut && nights >= 1 && price && (
                    <div className="mt-4 rounded-xl border border-forest-100 bg-white p-4">
                      <p className="mb-2 text-xs font-bold text-forest-700">کد تخفیف دارید؟</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={discountCode}
                          onChange={(e) => {
                            setDiscountCode(e.target.value.toUpperCase());
                            setDiscountInfo(null);
                            setDiscountError('');
                          }}
                          placeholder="مثلاً NOWRUZ1404"
                          disabled={Boolean(discountInfo)}
                          className="flex-1 rounded-xl border border-forest-200 bg-forest-50/40 px-4 py-2.5 text-sm font-bold tracking-widest text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200 disabled:opacity-60"
                        />
                        {discountInfo ? (
                          <button
                            onClick={() => {
                              setDiscountCode('');
                              setDiscountInfo(null);
                              setDiscountError('');
                            }}
                            className="btn-outline px-4 py-2.5 text-xs"
                          >
                            حذف
                          </button>
                        ) : (
                          <button onClick={applyDiscount} disabled={discountChecking} className="btn-primary px-4 py-2.5 text-sm">
                            {discountChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'اعمال'}
                          </button>
                        )}
                      </div>
                      {discountError && <p className="mt-2 text-xs text-red-600">{discountError}</p>}
                      {discountInfo && (
                        <p className="mt-2 text-xs text-emerald-600 font-medium">
                          کد تخفیف فعال شد — {faNum(discountInfo.percent)}٪ تخفیف روی مجموع اعمال می‌شود
                        </p>
                      )}
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
                    {jalaliFriendly(booking.checkIn!)} ← {jalaliFriendly(booking.checkOut!)} — {faNum(nights)} شب —{' '}
                    {faNum(booking.numberOfAdults)} بزرگسال
                    {booking.numberOfChildren > 0 ? ` و ${faNum(booking.numberOfChildren)} کودک` : ''}
                  </p>
                </div>
                <p className="font-black text-gold-600">{price ? formatToman(price.total) : ''}</p>
              </div>

              <div className="mb-5 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800 leading-relaxed">
                <BadgeCheck size={16} className="mt-0.5 shrink-0" />
                <p>
                  طبق قوانین هتل، هنگام ورود، مدارک شناسایی <b>همه مهمانان بزرگسال</b> (کارت ملی/شناسنامه) توسط پذیرش بررسی و
                  با اطلاعات ثبت‌شده در این فرم تطبیق داده می‌شود. لطفاً مشخصات را دقیق وارد کنید.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* مسافر اصلی */}
                <div className="sm:col-span-2 rounded-xl border border-forest-100 p-4">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-black text-forest-700">
                    <UserPlus size={16} className="text-gold-500" /> مسافر اصلی (سرپرست)
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
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
                      {fieldErrors.name && <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.name}</span>}
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-forest-600">کد ملی * (برای تطبیق مدارک)</span>
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
                      {fieldErrors.nationalId && <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.nationalId}</span>}
                    </label>
                    <label className="block">
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
                      {fieldErrors.email && <span className="mt-1.5 block text-xs text-red-600">{fieldErrors.email}</span>}
                    </label>
                    <label className="block">
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
                  </div>
                </div>

                {/* سایر بزرگسالان */}
                <div className="sm:col-span-2 rounded-xl border border-forest-100 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-black text-forest-700">
                    <Users size={16} className="text-gold-500" /> سایر مهمانان بزرگسال ({faNum(booking.numberOfAdults - 1)} نفر)
                  </h4>
                  {booking.numberOfAdults === 1 && (
                    <p className="text-xs text-forest-400">مهمان بزرگسال دیگری در این رزرو نیست.</p>
                  )}
                  {Array.from({ length: booking.numberOfAdults - 1 }, (_, i) => i).map((i) => {
                    const g = booking.guests[i] || { name: '', nationalId: '' };
                    return (
                      <div key={i} className="mt-3 grid gap-3 sm:grid-cols-2 rounded-lg bg-forest-50/50 p-3">
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-forest-600">نام و نام خانوادگی مهمان {faNum(i + 2)} *</span>
                          <input
                            type="text"
                            dir="rtl"
                            value={g.name}
                            onChange={(e) => setGuestRow(i, { name: e.target.value })}
                            placeholder="مثال: سارا احمدی"
                            className="w-full rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm text-forest-800 outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-medium text-forest-600">کد ملی مهمان {faNum(i + 2)} *</span>
                          <input
                            type="tel"
                            dir="ltr"
                            inputMode="numeric"
                            maxLength={10}
                            value={g.nationalId}
                            onChange={(e) => setGuestRow(i, { nationalId: toEnDigits(e.target.value).replace(/[^\d]/g, '').slice(0, 10) })}
                            placeholder="کد ۱۰ رقمی"
                            className="w-full rounded-xl border border-forest-200 bg-white px-4 py-2.5 text-sm text-forest-800 text-center tracking-widest font-bold outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-200"
                          />
                        </label>
                      </div>
                    );
                  })}
                  {fieldErrors.guests && <span className="mt-2 block text-xs text-red-600">{fieldErrors.guests}</span>}
                </div>

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
                یک کد ۶ رقمی به شماره شما پیامک می‌شود. این کد فقط <b>۲ دقیقه</b> معتبر است و <b>فقط یکبار</b> قابل استفاده است.
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
                <div className="flex justify-between">
                  <span className="text-forest-500">مسافران</span>
                  <b className="text-forest-800">
                    {faNum(booking.numberOfAdults)} بزرگسال
                    {booking.numberOfChildren > 0 ? ` + ${faNum(booking.numberOfChildren)} کودک` : ''}
                  </b>
                </div>
                <div className="flex justify-between"><span className="text-forest-500">نام سرپرست</span><b className="text-forest-800">{booking.guestName}</b></div>
                {booking.nationalId && (
                  <div className="flex justify-between">
                    <span className="text-forest-500">کد ملی</span>
                    <b className="text-forest-800" dir="ltr">{toFaDigits(booking.nationalId)}</b>
                  </div>
                )}
                <div className="border-t border-forest-100 pt-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-forest-500">{faNum(booking.numberOfAdults)} بزرگسال × {faNum(nights)} شب</span>
                    <b className="text-forest-700">{price ? formatToman(price.adultTotal) : ''}</b>
                  </div>
                  {price?.childLines.map((l, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-forest-500">کودک {faNum(i + 1)}{l.rate === 0 ? ' (رایگان)' : l.rate === Math.round((room?.pricePerNight ?? 0) / 2) ? ' (نیم‌بها)' : ' (کامل)'}</span>
                      <b className="text-forest-700">{l.total === 0 ? 'رایگان' : formatToman(l.total)}</b>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-forest-100 pt-2">
                    <span className="font-bold text-forest-600">مبلغ قابل پرداخت</span>
                    <b className="text-gold-600 text-lg">{formatToman(booking.reservation.total_price || price?.total || 0)}</b>
                  </div>
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