// src/controllers/document.controller.js
import pool from '../config/db.js';

// ─── HELPER: Generate Tracking Code ──────────────────────────────────────────
// Format: DTS-YYYYMMDD-XXXX (e.g. DTS-20240115-4F3A)
const generateTrackingCode = () => {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `DTS-${date}-${random}`;
};

// ─── CREATE DOCUMENT ─────────────────────────────────────────────────────────
export const createDocument = async (req, res) => {
  try {
    const { title, description, type } = req.body;
    const created_by   = req.user.id;
    const department   = req.user.department;

    // ── Validate required fields
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title and type are required.',
      });
    }

    // ── Generate unique tracking code (retry if collision)
    let tracking_code;
    let isUnique = false;
    while (!isUnique) {
      tracking_code = generateTrackingCode();
      const [existing] = await pool.execute(
        'SELECT id FROM documents WHERE tracking_code = ?',
        [tracking_code]
      );
      if (existing.length === 0) isUnique = true;
    }

    // ── Insert document
    const [result] = await pool.execute(
      `INSERT INTO documents 
        (tracking_code, title, description, type, status, current_location_dept, created_by)
       VALUES (?, ?, ?, ?, 'Created', ?, ?)`,
      [tracking_code, title, description || null, type, department, created_by]
    );

    const documentId = result.insertId;

    // ── Write first audit log entry
    await pool.execute(
      `INSERT INTO document_logs 
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, NULL, ?, ?)`,
      [documentId, 'Document Created', department, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Document created successfully.',
      data: {
        id:                   documentId,
        tracking_code,
        title,
        description:          description || null,
        type,
        status:               'Created',
        current_location_dept: department,
        created_by,
      },
    });

  } catch (error) {
    console.error('[CREATE DOCUMENT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during document creation.' });
  }
};

// ─── GET ALL DOCUMENTS ────────────────────────────────────────────────────────
// ─── GET ALL DOCUMENTS (with pagination) ──────────────────────────────────────
export const getAllDocuments = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(50, parseInt(req.query.limit) || 10);
    const offset   = (page - 1) * limit;
    const search   = req.query.search   || '';
    const status   = req.query.status   || '';
    const type     = req.query.type     || '';

    // ── Build WHERE clause dynamically
    const conditions = [];
    const params     = [];

    if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
      conditions.push('d.current_location_dept = ?');
      params.push(req.user.department);
    }

    if (search) {
      conditions.push('(d.title LIKE ? OR d.tracking_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      conditions.push('d.status = ?');
      params.push(status);
    }

    if (type) {
      conditions.push('d.type = ?');
      params.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // ── Count total matching records
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) as total FROM documents d ${where}`,
      params
    );

    // ── Fetch paginated results
    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept
       FROM documents d
       JOIN users u ON d.created_by = u.id
       ${where}
       ORDER BY d.created_at DESC
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
    return res.status(500).json({ success: false, message: 'Server error fetching documents.' });
  }
};

// ─── GET SINGLE DOCUMENT ──────────────────────────────────────────────────────
export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept
       FROM documents d
       JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });

  } catch (error) {
    console.error('[GET DOCUMENT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error fetching document.' });
  }
};

// ─── SEARCH DOCUMENT BY TRACKING CODE ────────────────────────────────────────
export const searchByTrackingCode = async (req, res) => {
  try {
    const { tracking_code } = req.query;

    if (!tracking_code) {
      return res.status(400).json({ success: false, message: 'tracking_code query param is required.' });
    }

    const [rows] = await pool.execute(
      `SELECT d.*, u.full_name AS created_by_name
       FROM documents d
       JOIN users u ON d.created_by = u.id
       WHERE d.tracking_code = ?`,
      [tracking_code]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No document found with that tracking code.' });
    }

    return res.status(200).json({ success: true, data: rows[0] });

  } catch (error) {
    console.error('[SEARCH ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during search.' });
  }
};