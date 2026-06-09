// src/middleware/logger.middleware.js
import pool from '../config/db.js';

// ─── LOG SYSTEM EVENT ─────────────────────────────────────────────────────────
export const logEvent = async ({
  user_id     = null,
  action,
  description,
  ip_address  = null,
  status      = 'success',
}) => {
  try {
    await pool.execute(
      `INSERT INTO system_logs (user_id, action, description, ip_address, status)
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, action, description, ip_address, status]
    );
  } catch (err) {
    // Never let logging crash the app
    console.error('[LOGGER ERROR]', err.message);
  }
};

// ─── GET CLIENT IP ────────────────────────────────────────────────────────────
export const getIP = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0] ||
  req.socket?.remoteAddress ||
  null;