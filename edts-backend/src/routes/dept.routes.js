// src/routes/dept.routes.js
import { Router } from 'express';
import pool from '../config/db.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import bcrypt from 'bcrypt';
import { logEvent, getIP } from '../middleware/logger.middleware.js';

const router  = Router();
const SALT_ROUNDS = 12;

router.use(protect, authorize('Admin', 'Super Admin'));

// ── Get users in Admin's own department
router.get('/my-department/users', async (req, res) => {
  try {
    const dept = req.user.department;
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, role, department, is_active, created_at
       FROM users WHERE department = ? AND role != 'Super Admin'
       ORDER BY created_at DESC`,
      [dept]
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Create Staff in Admin's own department only
router.post('/my-department/users', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const department = req.user.department;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, department, is_active)
       VALUES (?, ?, ?, 'Staff', ?, 1)`,
      [full_name, email, password_hash, department]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'USER_CREATED',
      description: `Admin ${req.user.email} created Staff account: ${email} in ${department}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(201).json({
      success: true,
      message: 'Staff account created.',
      data: { id: result.insertId, full_name, email, role: 'Staff', department },
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Edit user in Admin's own department
router.put('/my-department/users/:id', async (req, res) => {
  try {
    const { id }                       = req.params;
    const { full_name, email }         = req.body;
    const department                   = req.user.department;

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Admin can only edit users in their own department
    if (rows[0].department !== department) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your department.' });
    }

    if (rows[0].role === 'Super Admin' || rows[0].role === 'Admin') {
      return res.status(403).json({ success: false, message: 'You can only edit Staff accounts.' });
    }

    if (email && email !== rows[0].email) {
      const [emailCheck] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already in use.' });
      }
    }

    await pool.execute(
      `UPDATE users SET
        full_name = COALESCE(?, full_name),
        email     = COALESCE(?, email)
       WHERE id = ?`,
      [full_name || null, email || null, id]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'USER_UPDATED',
      description: `Admin ${req.user.email} updated Staff user ID ${id}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({ success: true, message: 'User updated.' });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Reset password of Staff in Admin's own department
router.patch('/my-department/users/:id/password', async (req, res) => {
  try {
    const { id }       = req.params;
    const { password } = req.body;
    const department   = req.user.department;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].department !== department) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your department.' });
    }

    if (rows[0].role !== 'Staff') {
      return res.status(403).json({ success: false, message: 'You can only reset Staff passwords.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);

    await logEvent({
      user_id:     req.user.id,
      action:      'PASSWORD_RESET',
      description: `Admin ${req.user.email} reset password for user ID ${id}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Toggle active status of Staff in Admin's department
router.patch('/my-department/users/:id/toggle', async (req, res) => {
  try {
    const { id }     = req.params;
    const department = req.user.department;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate yourself.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].department !== department) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your department.' });
    }

    if (rows[0].role !== 'Staff') {
      return res.status(403).json({ success: false, message: 'You can only toggle Staff accounts.' });
    }

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    await logEvent({
      user_id:     req.user.id,
      action:      newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      description: `Admin ${req.user.email} ${newStatus ? 'activated' : 'deactivated'} user ${rows[0].email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'}.`,
      data: { id, is_active: newStatus },
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});
// ── Get pending Staff registrations for Admin's department
router.get('/my-department/pending', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, department, created_at
       FROM users WHERE department = ? AND approval_status = 'pending'
       ORDER BY created_at ASC`,
      [req.user.department]
    );
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ── Approve/Reject Staff in Admin's department
router.patch('/my-department/pending/:id', async (req, res) => {
  try {
    const { id }       = req.params;
    const { decision } = req.body;

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'Invalid decision.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (rows[0].department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'You can only manage users in your department.' });
    }
    if (rows[0].approval_status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Already processed.' });
    }

    if (decision === 'approve') {
      await pool.execute(`UPDATE users SET approval_status='approved', is_active=1 WHERE id=?`, [id]);
    } else {
      await pool.execute(`UPDATE users SET approval_status='rejected', is_active=0 WHERE id=?`, [id]);
    }

    await logEvent({
      user_id:     req.user.id,
      action:      decision === 'approve' ? 'USER_APPROVED' : 'USER_REJECTED',
      description: `Admin ${req.user.email} ${decision}d registration for ${rows[0].email}`,
      ip_address:  getIP(req),
      status:      decision === 'approve' ? 'success' : 'warning',
    });

    return res.status(200).json({ success: true, message: `User ${decision}d.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});
export default router;