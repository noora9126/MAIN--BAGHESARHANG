const express = require("express");
const router = express.Router();

const { getRooms, getRoomById, getRoomAvailabilityController } = require("../controllers/roomController");

router.get("/", getRooms);
router.get("/:id/availability", getRoomAvailabilityController);
router.get("/:id", getRoomById);

module.exports = router;
