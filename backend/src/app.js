const roomRoutes = require("./routes/roomRoutes");
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/rooms", roomRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Bagh Sarhang Backend is Running");
});

module.exports = app;