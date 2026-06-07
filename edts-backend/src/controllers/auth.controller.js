// src/controllers/auth.controller.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const SALT_ROUNDS = 12;

// ─── REGISTER ────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { full_name, email, password, role, department } = req.body;

    // ── Validate required fields
    if (!full_name || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: 'full_name, email, password, and department are required.',
      });
    }

    // ── Validate role
    const allowedRoles = ['Admin', 'Staff'];
    const assignedRole = role && allowedRoles.includes(role) ? role : 'Staff';

    // ── Check if email already exists (parameterized — no SQL injection)
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

    // ── Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Insert new user
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, department)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, password_hash, assignedRole, department]
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        id:         result.insertId,
        full_name,
        email,
        role:       assignedRole,
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

    // ── Validate fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    // ── Find user by email
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',  // Deliberately vague for security
      });
    }

    const user = rows[0];

    // ── Compare password against stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Sign JWT — never put sensitive data in payload
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

// ─── GET CURRENT USER (me) ───────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    // req.user is attached by the protect middleware
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, role, department, created_at FROM users WHERE id = ?',
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