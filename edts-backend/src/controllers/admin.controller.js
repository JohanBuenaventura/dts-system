// src/controllers/admin.controller.js
import bcrypt from 'bcrypt';
import pool   from '../config/db.js';
import { logEvent, getIP } from '../middleware/logger.middleware.js';

const SALT_ROUNDS = 12;

// ════════════════════════════════════════
// USER MANAGEMENT
// ════════════════════════════════════════

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

export const createUser = async (req, res) => {
  try {
    const { full_name, email, password, role, department } = req.body;

    if (!full_name || !email || !password || !role || !department) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const allowedRoles = ['Admin', 'Staff'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
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

    await logEvent({
      user_id:     req.user.id,
      action:      'USER_CREATED',
      description: `${req.user.role} created ${role} account: ${email} (${department})`,
      ip_address:  getIP(req),
      status:      'success',
    });

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

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, department, role } = req.body;

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot edit a Super Admin account.' });
    }

    const allowedRoles = ['Admin', 'Staff'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
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
        full_name  = COALESCE(?, full_name),
        email      = COALESCE(?, email),
        department = COALESCE(?, department),
        role       = COALESCE(?, role)
       WHERE id = ?`,
      [full_name || null, email || null, department || null, role || null, id]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'USER_UPDATED',
      description: `User ID ${id} updated by ${req.user.role}: ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({ success: true, message: 'User updated successfully.' });

  } catch (error) {
    console.error('[UPDATE USER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot reset Super Admin password here.' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);

    await logEvent({
      user_id:     req.user.id,
      action:      'PASSWORD_RESET',
      description: `Password reset for user ID ${id} by ${req.user.role}: ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully.' });

  } catch (error) {
    console.error('[RESET PASSWORD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate a Super Admin account.' });
    }

    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.execute('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    await logEvent({
      user_id:     req.user.id,
      action:      newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      description: `User ${rows[0].email} ${newStatus ? 'activated' : 'deactivated'} by ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

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

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (rows[0].role === 'Super Admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete a Super Admin account.' });
    }

    const [docs] = await pool.execute('SELECT id FROM documents WHERE created_by = ?', [id]);
    if (docs.length > 0) {
      await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [id]);
      await logEvent({
        user_id:     req.user.id,
        action:      'USER_DEACTIVATED',
        description: `User ${rows[0].email} deactivated (has ${docs.length} documents) by ${req.user.email}`,
        ip_address:  getIP(req),
        status:      'warning',
      });
      return res.status(200).json({
        success: true,
        message: 'User has existing documents. Account deactivated instead of deleted.',
      });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    await logEvent({
      user_id:     req.user.id,
      action:      'USER_DELETED',
      description: `User ${rows[0].email} permanently deleted by ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'warning',
    });

    return res.status(200).json({ success: true, message: 'User deleted successfully.' });

  } catch (error) {
    console.error('[DELETE USER ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ════════════════════════════════════════
// DEPARTMENT MANAGEMENT
// ════════════════════════════════════════

export const getAllDepartments = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.*, COUNT(u.id) as user_count,
        ab.full_name as archived_by_name
       FROM departments d
       LEFT JOIN users u ON u.department = d.name AND u.is_active = 1
       LEFT JOIN users ab ON ab.id = d.archived_by
       GROUP BY d.id
       ORDER BY d.is_archived ASC, d.name ASC`
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[GET DEPARTMENTS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM departments WHERE name = ?', [name.trim()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Department already exists.' });
    }

    const [result] = await pool.execute(
      'INSERT INTO departments (name) VALUES (?)', [name.trim()]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'DEPARTMENT_CREATED',
      description: `Department "${name.trim()}" created by ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

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

export const updateDepartment = async (req, res) => {
  try {
    const { id }   = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Department name is required.' });
    }

    const [rows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const oldName = rows[0].name;

    const [existing] = await pool.execute(
      'SELECT id FROM departments WHERE name = ? AND id != ?', [name.trim(), id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Another department with that name already exists.' });
    }

    await pool.execute('UPDATE departments SET name = ? WHERE id = ?', [name.trim(), id]);
    await pool.execute('UPDATE users SET department = ? WHERE department = ?', [name.trim(), oldName]);
    await pool.execute(
      'UPDATE documents SET current_location_dept = ? WHERE current_location_dept = ?',
      [name.trim(), oldName]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'DEPARTMENT_RENAMED',
      description: `Department renamed from "${oldName}" to "${name.trim()}" by ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'success',
    });

    return res.status(200).json({ success: true, message: 'Department renamed successfully.' });

  } catch (error) {
    console.error('[UPDATE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── ARCHIVE DEPARTMENT ───────────────────────────────────────────────────────
export const archiveDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const dept      = rows[0];
    const isArchived = dept.is_archived;

    if (!isArchived) {
      // ── Archiving: check for active users
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE department = ? AND is_active = 1', [dept.name]
      );
      if (users.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot archive — ${users.length} active user(s) are still in this department. Reassign them first.`,
        });
      }

      await pool.execute(
        'UPDATE departments SET is_archived = 1, archived_at = NOW(), archived_by = ? WHERE id = ?',
        [req.user.id, id]
      );

      await logEvent({
        user_id:     req.user.id,
        action:      'DEPARTMENT_ARCHIVED',
        description: `Department "${dept.name}" archived by ${req.user.email}`,
        ip_address:  getIP(req),
        status:      'warning',
      });

      return res.status(200).json({ success: true, message: `Department "${dept.name}" archived.` });

    } else {
      // ── Restoring
      await pool.execute(
        'UPDATE departments SET is_archived = 0, archived_at = NULL, archived_by = NULL WHERE id = ?',
        [id]
      );

      await logEvent({
        user_id:     req.user.id,
        action:      'DEPARTMENT_RESTORED',
        description: `Department "${dept.name}" restored by ${req.user.email}`,
        ip_address:  getIP(req),
        status:      'success',
      });

      return res.status(200).json({ success: true, message: `Department "${dept.name}" restored.` });
    }

  } catch (error) {
    console.error('[ARCHIVE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    const deptName = rows[0].name;

    if (!rows[0].is_archived) {
      return res.status(400).json({
        success: false,
        message: 'Department must be archived before it can be deleted.',
      });
    }

    const [users] = await pool.execute(
      'SELECT id FROM users WHERE department = ? AND is_active = 1', [deptName]
    );
    if (users.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete — ${users.length} active user(s) assigned to this department.`,
      });
    }

    await pool.execute('DELETE FROM departments WHERE id = ?', [id]);

    await logEvent({
      user_id:     req.user.id,
      action:      'DEPARTMENT_DELETED',
      description: `Department "${deptName}" permanently deleted by ${req.user.email}`,
      ip_address:  getIP(req),
      status:      'warning',
    });

    return res.status(200).json({ success: true, message: 'Department permanently deleted.' });

  } catch (error) {
    console.error('[DELETE DEPT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ════════════════════════════════════════
// SYSTEM LOGS
// ════════════════════════════════════════

export const getSystemLogs = async (req, res) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(100, parseInt(req.query.limit) || 20);
    const offset    = (page - 1) * limit;
    const status    = req.query.status  || '';
    const action    = req.query.action  || '';
    const dateFrom  = req.query.from    || '';
    const dateTo    = req.query.to      || '';

    const conditions = [];
    const params     = [];

    if (status) { conditions.push('sl.status = ?');         params.push(status); }
    if (action) { conditions.push('sl.action LIKE ?');      params.push(`%${action}%`); }
    if (dateFrom) { conditions.push('sl.created_at >= ?');  params.push(dateFrom); }
    if (dateTo)   { conditions.push('sl.created_at <= ?');  params.push(dateTo + ' 23:59:59'); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM system_logs sl ${where}`, params
    );

    const [rows] = await pool.execute(
      `SELECT sl.*, u.full_name as user_name, u.role as user_role
       FROM system_logs sl
       LEFT JOIN users u ON sl.user_id = u.id
       ${where}
       ORDER BY sl.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return res.status(200).json({
      success: true,
      data:    rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
        hasPrev:    page > 1,
      },
    });

  } catch (error) {
    console.error('[GET LOGS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── CLEAR OLD LOGS ───────────────────────────────────────────────────────────
export const clearOldLogs = async (req, res) => {
  try {
    const { days = 30 } = req.body;

    const [result] = await pool.execute(
      'DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );

    await logEvent({
      user_id:     req.user.id,
      action:      'LOGS_CLEARED',
      description: `System logs older than ${days} days cleared by ${req.user.email}. ${result.affectedRows} records removed.`,
      ip_address:  getIP(req),
      status:      'warning',
    });

    return res.status(200).json({
      success: true,
      message: `${result.affectedRows} log entries older than ${days} days have been cleared.`,
    });

  } catch (error) {
    console.error('[CLEAR LOGS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ════════════════════════════════════════
// SYSTEM STATS
// ════════════════════════════════════════

export const getSystemStats = async (req, res) => {
  try {
    const [[userCount]]   = await pool.execute('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const [[docCount]]    = await pool.execute('SELECT COUNT(*) as count FROM documents');
    const [[inTransit]]   = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'In Transit'`);
    const [[completed]]   = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Completed'`);
    const [[received]]    = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Received'`);
    const [[created]]     = await pool.execute(`SELECT COUNT(*) as count FROM documents WHERE status = 'Created'`);
    const [[deptCount]]   = await pool.execute('SELECT COUNT(*) as count FROM departments WHERE is_archived = 0');
    const [[logCount]]    = await pool.execute('SELECT COUNT(*) as count FROM system_logs');
    const [[errorCount]]  = await pool.execute(`SELECT COUNT(*) as count FROM system_logs WHERE status = 'error' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`);
    const [[lastActivity]] = await pool.execute('SELECT created_at FROM system_logs ORDER BY created_at DESC LIMIT 1');

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
        users:        userCount.count,
        departments:  deptCount.count,
        totalLogs:    logCount.count,
        recentErrors: errorCount.count,
        lastActivity: lastActivity?.created_at || null,
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