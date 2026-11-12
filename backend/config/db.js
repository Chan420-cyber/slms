
const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 4000),

  // TiDB Cloud TLS connection
  ssl: {
    minVersion: "TLSv1.2"
  },

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 20000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

pool.on("error", (error) => {
  console.error("MySQL pool error:", error);
});

module.exports = pool;
