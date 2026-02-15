const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT) || 5000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const promisePool = pool.promise();

module.exports = promisePool;
