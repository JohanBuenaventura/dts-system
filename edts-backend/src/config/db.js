// src/config/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool — far more efficient than single connections.
// The pool manages multiple concurrent DB requests automatically.
const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,   // Queue requests when pool is full
  connectionLimit:    10,     // Max simultaneous connections
  queueLimit:         0,      // 0 = unlimited queue
  timezone:           'Z',    // Store/read timestamps as UTC
});

// Verify connectivity at startup — fail fast if misconfigured
export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅  MySQL connected successfully.');
    connection.release(); // Return it to the pool immediately
  } catch (error) {
    console.error('❌  MySQL connection failed:', error.message);
    process.exit(1); // Kill the process — app is unusable without DB
  }
};

export default pool;