// src/controllers/admin.controller.js
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const SALT_ROUNDS = 12;

// ════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════

// ─── GET ALL USERS ────────────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, role, department, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );
    return res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[GET ALL USERS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CREATE USER ──────────────────────────────────────────────────────────────
export const createUser = async (req, res) => {
  try {
    const { full_name, email, password, role, department } = req.body;

    if (!full_name || !email || !password || !role || !department) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.',
      });
    }

    const allowedRoles = ['Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role.',
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists.',
      });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, department, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [full_name, email, password_hash, role, department]
    );

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully.`,
      data: { id: result.insertId, full_name, email, role, department, is_active: 1 },
    });

  } catch (error) {
    console.error('[CREATE USER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE USER ──────────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, department, role } = req.body;

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit a Super Admin account.',
      });
    }

    const allowedRoles = ['Admin', 'Staff'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    // Check email uniqueness if changed
    if (email && email !== rows[0].email) {
      const [emailCheck] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?', [email, id]
      );
      if (emailCheck.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use by another account.',
        });
      }
    }

    await pool.execute(
      `UPDATE users SET
        full_name  = COALESCE(?, full_name),
        email      = COALESCE(?, email),
        department = COALESCE(?, department),
        role       = COALESCE(?, role)
       WHERE id = ?`,
      [full_name || null, email || null, department || null, role || null, id]
    );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
    });

  } catch (error) {
    console.error('[UPDATE USER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── RESET USER PASSWORD ──────────────────────────────────────────────────────
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot reset Super Admin password here.',
      });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [password_hash, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });

  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── TOGGLE USER STATUS ───────────────────────────────────────────────────────
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate a Super Admin account.',
      });
    }

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.status(200).json({
      success: true,
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data: { id, is_active: newStatus },
    });

  } catch (error) {
    console.error('[TOGGLE STATUS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE USER ──────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete a Super Admin account.',
      });
    }

    // Check if user has documents — soft delete instead
    const [docs] = await pool.execute(
      'SELECT id FROM documents WHERE created_by = ?', [id]
    );

    if (docs.length > 0) {
      // User has documents — deactivate instead of hard delete
      await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
      return res.status(200).json({
        success: true,
        message: 'User has existing documents. Account deactivated instead of deleted.',
      });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully.',
    });

  } catch (error) {
    console.error('[DELETE USER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ════════════════════════════════════════
// DEPARTMENT MANAGEMENT
// ════════════════════════════════════════

// ─── GET ALL DEPARTMENTS ──────────────────────────────────────────────────────
export const getAllDepartments = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, COUNT(u.id) as user_count
       FROM departments d
       LEFT JOIN users u ON u.department = d.name AND u.is_active = 1
       GROUP BY d.id
       ORDER BY d.name ASC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[GET DEPARTMENTS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CREATE DEPARTMENT ────────────────────────────────────────────────────────
export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM departments WHERE name = ?', [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Department already exists.',
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO departments (name) VALUES (?)', [name.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      data: { id: result.insertId, name: name.trim() },
    });

  } catch (error) {
    console.error('[CREATE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── UPDATE DEPARTMENT ────────────────────────────────────────────────────────
export const updateDepartment = async (req, res) => {
  try {
    const { id }   = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Department name is required.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM departments WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const oldName = rows[0].name;

    // Check name uniqueness
    const [existing] = await pool.execute(
      'SELECT id FROM departments WHERE name = ? AND id != ?', [name.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Another department with that name already exists.',
      });
    }

    // Update department name
    await pool.execute(
      'UPDATE departments SET name = ? WHERE id = ?', [name.trim(), id]
    );

    // Cascade update users and documents with old name
    await pool.execute(
      'UPDATE users SET department = ? WHERE department = ?', [name.trim(), oldName]
    );
    await pool.execute(
      'UPDATE documents SET current_location_dept = ? WHERE current_location_dept = ?',
      [name.trim(), oldName]
    );

    return res.status(200).json({
      success: true,
      message: 'Department renamed successfully.',
    });

  } catch (error) {
    console.error('[UPDATE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DELETE DEPARTMENT ────────────────────────────────────────────────────────
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM departments WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const deptName = rows[0].name;

    // Block deletion if users are assigned to this department
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE department = ? AND is_active = 1', [deptName]
    );
    if (users.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${users.length} active user(s) are assigned to this department.`,
      });
    }

    // Block deletion if documents are currently here
    const [docs] = await pool.execute(
      'SELECT id FROM documents WHERE current_location_dept = ?', [deptName]
    );
    if (docs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${docs.length} document(s) are currently in this department.`,
      });
    }

    await pool.execute('DELETE FROM departments WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Department deleted successfully.',
    });

  } catch (error) {
    console.error('[DELETE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ════════════════════════════════════════
// SYSTEM STATS
// ════════════════════════════════════════

export const getSystemStats = async (req, res) => {
  try {
    const [[userCount]]  = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const [[docCount]]   = await pool.execute('SELECT COUNT(*) as count FROM documents');
    const [[inTransit]]  = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'In Transit'`);
    const [[completed]]  = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Completed'`);
    const [[received]]   = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Received'`);
    const [[created]]    = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Created'`);
    const [[deptCount]]  = await pool.execute('SELECT COUNT(*) as count FROM departments');

    const [perDept] = await pool.execute(
      `SELECT current_location_dept as department, COUNT(*) as count
       FROM documents GROUP BY current_location_dept ORDER BY count DESC`
    );

    const [monthly] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
       FROM documents
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    const [byType] = await pool.execute(
      `SELECT type, COUNT(*) as count FROM documents GROUP BY type ORDER BY count DESC`
    );

    return res.status(200).json({
      success: true,
      data: {
        users:       userCount.count,
        departments: deptCount.count,
        documents: {
          total:     docCount.count,
          created:   created.count,
          inTransit: inTransit.count,
          received:  received.count,
          completed: completed.count,
        },
        perDepartment: perDept,
        monthly,
        byType,
      },
    });

  } catch (error) {
    console.error('[STATS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error fetching stats.' });
  }
};