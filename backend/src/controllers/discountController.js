const { applyDiscountByCode } = require("../services/discountService");

// ─────────────── بررسی صحت کد تخفیف (برای فرم رزرو) ───────────────
const validateDiscount = async (req, res) => {
  try {
    const { code, phone } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: "کد تخفیف را وارد کنید" });
    }
    const [baseTotal] = await checkBaseTotal(req.body);

    const discount = await applyDiscountByCode({
      code,
      phone: phone || "",
      totalPrice: baseTotal,
    });

    res.json({
      success: true,
      discount: {
        code: discount.code,
        percent: discount.percent,
        amount: discount.amount,
        reason: discount.reason,
      },
    });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, message: err.message || "کد تخفیف نامعتبر است" });
  }
};

// ─────────────── محاسبه مبلغ پایه برای اعتبارسنجی ───────────────
async function checkBaseTotal({ roomId, checkIn, checkOut, numberOfAdults, numberOfChildren, childAges }) {
  const { getRoomById, calculatePricing } = require("../services/reservationService");
  const room = await getRoomById(Number(roomId));
  if (!room) {
    const err = new Error("اتاق یافت نشد");
    err.status = 404;
    throw err;
  }
  const pricing = await calculatePricing(
    room,
    String(checkIn),
    String(checkOut),
    Number(numberOfAdults) || 1,
    Number(numberOfChildren) || 0,
    Array.isArray(childAges) ? childAges : []
  );
  return [pricing.totalPrice];
}

module.exports = { validateDiscount };