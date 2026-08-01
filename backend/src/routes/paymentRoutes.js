const express = require("express");
const router = express.Router();

const {
  requestPaymentController,
  verifyPaymentController,
  manualConfirmPayment,
} = require("../controllers/paymentController");

router.post("/request", requestPaymentController);
router.get("/verify", verifyPaymentController);
router.post("/manual-confirm", manualConfirmPayment);

module.exports = router;
