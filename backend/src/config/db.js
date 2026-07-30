const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "baghsarhang_db",
});

connection.connect((err) => {
  if (err) {
    console.log("❌ Database Error");
    console.log(err);
    return;
  }

  console.log("✅ MySQL Connected");
});

module.exports = connection;