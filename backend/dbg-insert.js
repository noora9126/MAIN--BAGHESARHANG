require("dotenv").config();
const { query } = require("./src/config/db");
const { applyDiscountByCode, incrementDiscountUsage } = require("./src/services/discountService");
const { getRoomById, calculatePricing, nextReservationNumber } = require("./src/services/reservationService");

(async () => {
  try {
    const room = await getRoomById(5);
    const pricing = await calculatePricing(room, "2026-09-10", "2026-09-12", 1, 0, []);
    console.log("base total:", pricing.totalPrice);
    const discount = await applyDiscountByCode({ code: "TEST10", phone: "", totalPrice: pricing.totalPrice });
    console.log("discount:", discount);
    pricing.totalPrice = Math.max(0, pricing.totalPrice - discount.amount);
    const reservationNumber = await nextReservationNumber();
    const result = await query(
      `INSERT INTO reservations
        (reservation_number, room_id, room_number, room_name, check_in, check_out,
         number_of_nights, number_of_guests, number_of_adults, number_of_children,
         child_ages, guest_details,
         guest_name, guest_email, guest_phone,
         guest_national_id, special_requests, price_per_night, total_price,
         discount_code, discount_percent, discount_amount, discount_reason,
         status, payment_status, sms_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'PENDING', 'PENDING')`,
      [
        reservationNumber, room.id, room.roomNumber || null, room.name, "2026-09-10", "2026-09-12",
        pricing.nights, 1, 1, 0,
        JSON.stringify([]), JSON.stringify([{ name: "علی محمدی", nationalId: "0012345678" }]),
        "علی محمدی", "ali.test@example.com", "",
        "0012345678", "test", pricing.adultPrice, pricing.totalPrice,
        discount.code, discount.percent, discount.amount, discount.reason,
      ]
    );
    console.log("INSERT OK id:", result.insertId);
    await incrementDiscountUsage("TEST10");
    process.exit(0);
  } catch (e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
})();