const { parseDateOnly } = require("../utils/helpers");

// ─────────────── ثابت‌های کسب‌وکار ───────────────
const CANCELLATION_DEADLINE_HOURS = 72;

/**
 * محاسبه صلاحیت لغو رزرو بر اساس قانون ۷۲ ساعت قبل از ورود.
 *
 * @param {Object} reservation - رکورد رزرو از دیتابیس (باید check_in داشته باشد)
 * @param {Date} [now=new Date()] - زمان فعلی سرور
 * @returns {Object} { eligible: boolean, reason: string, hoursRemaining: number|null, checkInDate: Date }
 */
function calculateCancellationEligibility(reservation, now = new Date()) {
  if (!reservation || !reservation.check_in) {
    return { eligible: false, reason: "اطلاعات رزرو نامعتبر است", hoursRemaining: null, checkInDate: null };
  }

  // وضعیت‌هایی که قابل لغو نیستند
  const nonCancellableStatuses = ["CHECKED_IN", "CHECKED_OUT", "CANCELLED"];
  if (nonCancellableStatuses.includes(reservation.status)) {
    return { eligible: false, reason: "این رزرو در وضعیت قابل لغو نیست", hoursRemaining: null, checkInDate: null };
  }

  // پرداخت نشده → فقط ادمین می‌تواند لغو کند (مشتری نمی‌تواند)
  if (reservation.payment_status !== "SUCCESS") {
    return { eligible: false, reason: "فقط رزروهای پرداخت‌شده قابل لغو توسط مشتری هستند", hoursRemaining: null, checkInDate: null };
  }

  const checkInDate = parseDateOnly(reservation.check_in);
  if (!checkInDate) {
    return { eligible: false, reason: "تاریخ ورود نامعتبر است", hoursRemaining: null, checkInDate: null };
  }

  // محاسبه ساعت‌های باقی‌مانده تا ورود
  const diffMs = checkInDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  if (hoursRemaining < CANCELLATION_DEADLINE_HOURS) {
    const remainingHours = Math.max(0, hoursRemaining);
    return {
      eligible: false,
      reason: `تا زمان ورود کمتر از ${CANCELLATION_DEADLINE_HOURS} ساعت باقی مانده است (${Math.floor(remainingHours)} ساعت و ${Math.floor((remainingHours % 1) * 60)} دقیقه)`,
      hoursRemaining: remainingHours,
      checkInDate,
    };
  }

  return {
    eligible: true,
    reason: "شما می‌توانید این رزرو را لغو کنید",
    hoursRemaining,
    checkInDate,
  };
}

/**
 * بررسی وضعیت درخواست لغو فعلی رزرو
 * @param {Object} reservation
 * @returns {string|null} - نوع درخواست فعال یا null
 */
function getActiveCancellationRequest(reservation) {
  if (!reservation) return null;
  if (reservation.status === "CANCELLATION_REQUESTED") return "CANCELLATION_REQUESTED";
  if (reservation.status === "REFUND_PENDING") return "REFUND_PENDING";
  return null;
}

module.exports = {
  CANCELLATION_DEADLINE_HOURS,
  calculateCancellationEligibility,
  getActiveCancellationRequest,
};
