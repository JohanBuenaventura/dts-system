// src/controllers/auth.controller.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const SALT_ROUNDS = 12;

// ─── REGISTER ────────────────────────────────────────────────────────────────
// Public — always creates Staff only, no role selection allowed
export const register = async (req, res) => {
  try {
    const { full_name, email, password, department } = req.body;

    if (!full_name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'full_name, email, password, and department are required.',
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists.',
      });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Role is ALWAYS Staff on self-registration — no exceptions
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, department, is_active)
       VALUES (?, ?, ?, 'Staff', ?, 1)`,
      [full_name, email, password_hash, department]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        id:         result.insertId,
        full_name,
        email,
        role:       'Staff',
        department,
      },
    });

  } catch (error) {
    console.error('[REGISTER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    // ── Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact the administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        department: user.department,
        full_name:  user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id:         user.id,
        full_name:  user.full_name,
        email:      user.email,
        role:       user.role,
        department: user.department,
      },
    });

  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ─── GET CURRENT USER ─────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, role, department, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });

  } catch (error) {
    console.error('[GET ME ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};