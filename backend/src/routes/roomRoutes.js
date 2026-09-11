const express = require("express");
const router = express.Router();

const { getRooms, getRoomById, getRoomBySlug, getRoomAvailabilityController } = require("../controllers/roomController");

router.get("/", getRooms);
router.get("/slug/:slug", getRoomBySlug);
router.get("/:id/availability", getRoomAvailabilityController);
router.get("/:id", getRoomById);

module.exports = router;
