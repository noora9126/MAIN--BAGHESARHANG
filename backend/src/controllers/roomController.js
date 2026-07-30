const db = require("../config/db");

const getRooms = (req, res) => {
  db.query("SELECT * FROM rooms", (err, results) => {
    if (err) {
      return res.status(500).json({
        message: "Database Error",
        error: err,
      });
    }

    res.json(results);
  });
};

module.exports = {
  getRooms,
};