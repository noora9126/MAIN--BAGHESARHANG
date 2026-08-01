const express = require("express");
const router = express.Router();

const { authAdmin } = require("../middleware/auth");
const { adminLoginLimiter, adminSmsLimiter } = require("../middleware/rateLimiters");

const adminAuth = require("../controllers/adminAuthController");
const adminReservations = require("../controllers/adminReservationController");
const adminAnalytics = require("../controllers/adminAnalyticsController");
const adminGuests = require("../controllers/adminGuestController");
const adminSettings = require("../controllers/adminSettingsController");

// ─────────────── احراز هویت ───────────────
router.post("/login", adminLoginLimiter, adminAuth.login);
router.get("/me", authAdmin, adminAuth.me);
router.post("/change-password", authAdmin, adminAuth.changePassword);

// ─────────────── رزروها ───────────────
router.get("/reservations", authAdmin, adminReservations.listReservations);
router.get("/reservations/:id", authAdmin, adminReservations.getReservation);
router.put("/reservations/:id", authAdmin, adminReservations.updateReservation);
router.post("/reservations/:id/check-in", authAdmin, adminReservations.checkIn);
router.post("/reservations/:id/check-out", authAdmin, adminReservations.checkOut);
router.post("/reservations/:id/cancel", authAdmin, adminReservations.cancelReservation);
router.post("/reservations/:id/send-sms", authAdmin, adminSmsLimiter, adminReservations.sendReservationSms);

// ─────────────── مهمانان ───────────────
router.get("/guests", authAdmin, adminGuests.listGuests);
router.get("/guests/:phone", authAdmin, adminGuests.getGuest);
router.put("/guests/:phone/notes", authAdmin, adminGuests.updateGuestNotes);
router.post("/guests/:phone/send-sms", authAdmin, adminSmsLimiter, adminGuests.sendGuestSms);

// ─────────────── تحلیل‌ها ───────────────
router.get("/analytics/dashboard", authAdmin, adminAnalytics.dashboard);
router.get("/analytics/revenue", authAdmin, adminAnalytics.revenue);
router.get("/analytics/occupancy", authAdmin, adminAnalytics.occupancy);
router.get("/analytics/rooms", authAdmin, adminAnalytics.roomsPerformance);
router.get("/analytics/guests", authAdmin, adminAnalytics.guestStats);

// ─────────────── تنظیمات ───────────────
router.get("/settings", authAdmin, adminSettings.getSettings);
router.put("/settings", authAdmin, adminSettings.updateSettings);
router.post("/settings/test-sms", authAdmin, adminSettings.testSms);
router.get("/rooms", authAdmin, adminSettings.listRooms);
router.put("/rooms/:id", authAdmin, adminSettings.updateRoom);

module.exports = router;
