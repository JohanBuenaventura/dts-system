// src/controllers/document.controller.js
import pool from '../config/db.js';

const SALT_ROUNDS = 12;

const generateTrackingCode = () => {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `EDTS-${date}-${random}`;
};

// ─── CREATE DOCUMENT ──────────────────────────────────────────────────────────
export const createDocument = async (req, res) => {
  try {
    const {
      title, description, type, document_type,
      due_date, urgency, dest_department,
    } = req.body;

    const created_by = req.user.id;
    const department = req.user.department;

    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required.',
      });
    }

    let tracking_code;
    let isUnique = false;
    while (!isUnique) {
      tracking_code = generateTrackingCode();
      const [existing] = await pool.execute(
        'SELECT id FROM documents WHERE tracking_code = ?', [tracking_code]
      );
      if (existing.length === 0) isUnique = true;
    }

    const [result] = await pool.execute(
      `INSERT INTO documents
        (tracking_code, title, description, type, document_type,
         due_date, urgency, dest_department, status,
         current_location_dept, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Created', ?, ?)`,
      [
        tracking_code, title, description || null,
        type, document_type || 'General', 
        due_date || null,
        urgency  || 'Normal',
        dest_department || null,
        department, created_by,
      ]
    );

    const documentId = result.insertId;

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, 'Document Created', NULL, ?, ?)`,
      [documentId, department, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Document created successfully.',
      data: {
        id: documentId, tracking_code, title,
        description: description || null,
        type, document_type: document_type || 'General',
        due_date: due_date || null,
        urgency:  urgency  || 'Normal',
        dest_department: dest_department || null,
        status: 'Created',
        current_location_dept: department,
        created_by,
      },
    });

  } catch (error) {
    console.error('[CREATE DOCUMENT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ALL DOCUMENTS (paginated) ────────────────────────────────────────────
export const getAllDocuments = async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.min(10000, parseInt(req.query.limit) || 10);
    const offset  = (page - 1) * limit;
    const search  = req.query.search  || '';
    const status  = req.query.status  || '';
    const type    = req.query.type    || '';
    const urgency = req.query.urgency || '';

    const conditions = [];
    const params     = [];

    // FIXED: Strict ownership visibility logic
    if (req.user.role === 'Admin') {
      // Admins see everything currently in their department, created by members of their department, or routed to their department
      conditions.push(`(
        d.current_location_dept = ? OR 
        u.department = ? OR 
        EXISTS (SELECT 1 FROM document_recipients dr WHERE dr.document_id = d.id AND dr.department = ?)
      )`);
      params.push(req.user.department, req.user.department, req.user.department);
    } else if (req.user.role === 'Staff') {
      // Staff members ONLY see documents they created themselves, or documents explicitly routed to them
      conditions.push(`(
        d.created_by = ? OR 
        EXISTS (
          SELECT 1 FROM document_recipients dr 
          WHERE dr.document_id = d.id AND dr.department = ? AND (dr.user_id = ? OR dr.user_id IS NULL)
        )
      )`);
      params.push(req.user.id, req.user.department, req.user.id);
    }

    if (search) {
      conditions.push('(d.title LIKE ? OR d.tracking_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status)  { conditions.push('d.status = ?');  params.push(status);  }
    if (type)    { conditions.push('d.type = ?');    params.push(type);    }
    if (urgency) { conditions.push('d.urgency = ?'); params.push(urgency); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM documents d JOIN users u ON d.created_by = u.id ${where}`, params
    );

    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept,
        CASE
          WHEN d.due_date IS NOT NULL AND d.due_date < CURDATE() THEN 'overdue'
          WHEN d.due_date IS NOT NULL AND d.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'due_soon'
          ELSE 'ok'
        END AS due_status
       FROM documents d
       JOIN users u ON d.created_by = u.id
       ${where}
       ORDER BY
         FIELD(d.urgency, 'Highly Urgent', 'Urgent', 'Normal'),
         d.due_date IS NULL ASC,
         d.due_date ASC,
         d.created_at DESC
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
    console.error('[GET ALL DOCUMENTS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET SINGLE DOCUMENT ──────────────────────────────────────────────────────
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept,
        CASE
          WHEN d.due_date IS NOT NULL AND d.due_date < CURDATE() THEN 'overdue'
          WHEN d.due_date IS NOT NULL AND d.due_date <= DATE_ADD(CURDATE(), INTERVAL 3 DAY) THEN 'due_soon'
          ELSE 'ok'
        END AS due_status
       FROM documents d
       JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const doc = rows[0];

    // FIXED: Strict Direct-URL Security validation
    if (req.user.role === 'Admin') {
      if (doc.current_location_dept !== req.user.department && doc.created_by_dept !== req.user.department) {
        const [dr] = await pool.execute('SELECT id FROM document_recipients WHERE document_id = ? AND department = ?', [id, req.user.department]);
        if (dr.length === 0) {
          return res.status(403).json({ success: false, message: 'Access denied. Document is outside your department scope.' });
        }
      }
    } else if (req.user.role === 'Staff') {
      // Staff cannot bypass verification simply because a document sits in their department
      if (doc.created_by !== req.user.id) {
        const [dr] = await pool.execute(
          'SELECT id FROM document_recipients WHERE document_id = ? AND department = ? AND (user_id = ? OR user_id IS NULL)', 
          [id, req.user.department, req.user.id]
        );
        if (dr.length === 0) {
          return res.status(403).json({ success: false, message: 'Access denied. You can only view documents you created or that are explicitly routed to you.' });
        }
      }
    }

    const [recipients] = await pool.execute(
      `SELECT dr.*, u.full_name AS user_name
       FROM document_recipients dr
       LEFT JOIN users u ON dr.user_id = u.id
       WHERE dr.document_id = ?
       ORDER BY dr.notified_at ASC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: { ...doc, recipients },
    });

  } catch (error) {
    console.error('[GET DOCUMENT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── SEARCH BY TRACKING CODE ──────────────────────────────────────────────────
export const searchByTrackingCode = async (req, res) => {
  try {
    const { tracking_code } = req.query;
    if (!tracking_code) {
      return res.status(400).json({ success: false, message: 'tracking_code is required.' });
    }

    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name
       FROM documents d
       JOIN users u ON d.created_by = u.id
       WHERE d.tracking_code = ?`,
      [tracking_code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No document found.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });

  } catch (error) {
    console.error('[SEARCH ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET OVERDUE COUNT ────────────────────────────────────────────────────────
export const getOverdueCount = async (req, res) => {
  try {
    const conditions = [`d.due_date < CURDATE()`, `d.status != 'Completed'`];
    const params     = [];

    // FIXED: Standardized security filters applied to dashboard statistics
    if (req.user.role === 'Admin') {
      conditions.push(`(
        d.current_location_dept = ? OR 
        u.department = ? OR 
        EXISTS (SELECT 1 FROM document_recipients dr WHERE dr.document_id = d.id AND dr.department = ?)
      )`);
      params.push(req.user.department, req.user.department, req.user.department);
    } else if (req.user.role === 'Staff') {
      conditions.push(`(
        d.created_by = ? OR 
        EXISTS (SELECT 1 FROM document_recipients dr WHERE dr.document_id = d.id AND dr.department = ? AND (dr.user_id = ? OR dr.user_id IS NULL))
      )`);
      params.push(req.user.id, req.user.department, req.user.id);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ count }]] = await pool.execute(
      `SELECT COUNT(*) as count FROM documents d JOIN users u ON d.created_by = u.id ${where}`,
      params
    );

    return res.status(200).json({ success: true, data: { overdue: count } });

  } catch (error) {
    console.error('[OVERDUE COUNT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ACTIVE DEPARTMENTS (For Dropdowns) ───────────────────────────────────
export const getActiveDepartments = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name FROM departments 
      WHERE is_archived = 0 AND name != 'System Administrator' 
      ORDER BY name ASC
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[GET ACTIVE DEPTS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET ACTIVE DOCUMENT TYPES (For Dropdowns) ────────────────────────────────
export const getActiveDocumentTypes = async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, name FROM document_types 
      WHERE is_archived = 0 
      ORDER BY name ASC
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[GET ACTIVE DOC TYPES ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};