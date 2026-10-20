const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool kết nối tái sử dụng, tránh mở/đóng connection liên tục
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT) || 4, // gói DEV của Clever Cloud chỉ cho tối đa 5 kết nối cùng lúc
  queueLimit: 0,
});

module.exports = pool;
