const express = require("express");
const router = express.Router();

const { getRooms, getRoomById } = require("../controllers/roomController");

router.get("/", getRooms);
router.get("/:id", getRoomById);

module.exports = router;
