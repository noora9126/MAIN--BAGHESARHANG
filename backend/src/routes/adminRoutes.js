const express = require("express");
const router = express.Router();

const { authAdmin } = require("../middleware/auth");
const { requirePermission, requireAnyPermission } = require("../middleware/permission");
const { adminLoginLimiter, adminSmsLimiter } = require("../middleware/rateLimiters");

const adminAuth = require("../controllers/adminAuthController");
const adminReservations = require("../controllers/adminReservationController");
const adminAnalytics = require("../controllers/adminAnalyticsController");
const adminGuests = require("../controllers/adminGuestController");
const adminSettings = require("../controllers/adminSettingsController");
const adminNotifications = require("../controllers/adminNotificationController");
const adminDiscounts = require("../controllers/adminDiscountController");
const adminReviews = require("../controllers/adminReviewController");
const adminRefunds = require("../controllers/refundController");

// ─────────────── احراز هویت ───────────────
router.post("/login", adminLoginLimiter, adminAuth.login);
router.get("/me", authAdmin, adminAuth.me);
router.post("/change-password", authAdmin, adminAuth.changePassword);

// ─────────────── رزروها ───────────────
router.get("/reservations", authAdmin, requirePermission("reservations.view"), adminReservations.listReservations);
router.get("/reservations/:id", authAdmin, requirePermission("reservations.view"), adminReservations.getReservation);
router.put("/reservations/:id", authAdmin, requirePermission("reservations.update"), adminReservations.updateReservation);
router.post("/reservations/:id/check-in", authAdmin, requirePermission("reservations.update"), adminReservations.checkIn);
router.post("/reservations/:id/check-out", authAdmin, requirePermission("reservations.update"), adminReservations.checkOut);
router.post("/reservations/:id/cancel", authAdmin, requirePermission("reservations.cancel"), adminReservations.cancelReservation);
router.post("/reservations/:id/send-sms", authAdmin, adminSmsLimiter, requirePermission("sms.send"), adminReservations.sendReservationSms);
router.get("/availability", authAdmin, requirePermission("reservations.view"), adminReservations.getCalenderData);

// ─────────────── مهمانان ───────────────
router.get("/guests", authAdmin, requirePermission("customers.view"), adminGuests.listGuests);
router.get("/guests/:phone", authAdmin, requirePermission("customers.view"), adminGuests.getGuest);
router.put("/guests/:phone/notes", authAdmin, requirePermission("customers.update"), adminGuests.updateGuestNotes);
router.post("/guests/:phone/send-sms", authAdmin, adminSmsLimiter, requirePermission("sms.send"), adminGuests.sendGuestSms);

// ─────────────── تحلیل‌ها ───────────────
router.get("/analytics/dashboard", authAdmin, requirePermission("analytics.view"), adminAnalytics.dashboard);
router.get("/analytics/revenue", authAdmin, requirePermission("analytics.view"), adminAnalytics.revenue);
router.get("/analytics/occupancy", authAdmin, requirePermission("analytics.view"), adminAnalytics.occupancy);
router.get("/analytics/rooms", authAdmin, requirePermission("analytics.view"), adminAnalytics.roomsPerformance);
router.get("/analytics/guests", authAdmin, requirePermission("analytics.view"), adminAnalytics.guestStats);

// ─────────────── تنظیمات ───────────────
router.get("/settings", authAdmin, requirePermission("settings.view"), adminSettings.getSettings);
router.put("/settings", authAdmin, requirePermission("settings.update"), adminSettings.updateSettings);
router.get("/rooms", authAdmin, requirePermission("rooms.view"), adminSettings.listRooms);
router.post("/rooms", authAdmin, requirePermission("rooms.create"), adminSettings.createRoom);
router.put("/rooms/:id", authAdmin, requirePermission("rooms.update"), adminSettings.updateRoom);

// ─────────────── اعلان‌ها ───────────────
router.get("/notifications", authAdmin, requirePermission("notifications.send"), adminNotifications.listNotifications);
router.post("/notifications/:id/read", authAdmin, requirePermission("notifications.send"), adminNotifications.markRead);
router.post("/notifications/read-all", authAdmin, requirePermission("notifications.send"), adminNotifications.markAllRead);

// ─────────────── تخفیف‌ها ───────────────
router.get("/discounts", authAdmin, requirePermission("discounts.view"), adminDiscounts.listDiscounts);
router.post("/discounts", authAdmin, requirePermission("discounts.manage"), adminDiscounts.createDiscount);
router.put("/discounts/:id", authAdmin, requirePermission("discounts.manage"), adminDiscounts.updateDiscount);
router.delete("/discounts/:id", authAdmin, requirePermission("discounts.manage"), adminDiscounts.deleteDiscount);
router.post("/discounts/:id/toggle", authAdmin, requirePermission("discounts.manage"), adminDiscounts.toggleDiscount);

// ─────────────── نظرات ───────────────
router.get("/reviews", authAdmin, requirePermission("reviews.view"), adminReviews.listReviews);
router.post("/reviews/sync", authAdmin, requirePermission("reviews.manage"), adminReviews.syncReviewsHandler);
router.post("/reviews/:id/toggle", authAdmin, requirePermission("reviews.manage"), adminReviews.toggleReview);
router.delete("/reviews/:id", authAdmin, requirePermission("reviews.manage"), adminReviews.deleteReview);

// ─────────────── درخواست‌های لغو و بازپرداخت ───────────────
router.get("/refunds", authAdmin, requireAnyPermission(["refunds.view", "refunds.process", "refunds.confirm"]), adminRefunds.listRefundRequests);
router.get("/refunds/:id", authAdmin, requireAnyPermission(["refunds.view", "refunds.process", "refunds.confirm"]), adminRefunds.getRefundRequest);
router.get("/refunds/:id/card-details", authAdmin, requireAnyPermission(["refunds.process", "refunds.confirm"]), adminRefunds.getRefundCardDetails);
router.post("/refunds/:id/process", authAdmin, requireAnyPermission(["refunds.process", "refunds.confirm"]), adminRefunds.processRefundRequest);
router.post("/refunds/:id/confirm-payment", authAdmin, requirePermission("refunds.confirm"), adminRefunds.confirmRefundPayment);
router.post("/refunds/:id/reject", authAdmin, requireAnyPermission(["refunds.process", "refunds.confirm"]), adminRefunds.rejectRefundRequest);

module.exports = router;
