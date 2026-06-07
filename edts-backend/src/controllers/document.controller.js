// src/controllers/document.controller.js
import pool from '../config/db.js';

// ─── HELPER: Generate Tracking Code ──────────────────────────────────────────
// Format: EDTS-YYYYMMDD-XXXX (e.g. EDTS-20240115-4F3A)
const generateTrackingCode = () => {
  const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `EDTS-${date}-${random}`;
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
export const getAllDocuments = async (req, res) => {
  try {
    // Admins see all documents; Staff see only documents in their department
    let query;
    let params;

    if (req.user.role === 'Admin') {
      query = `
        SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept
        FROM documents d
        JOIN users u ON d.created_by = u.id
        ORDER BY d.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT d.*, u.full_name AS created_by_name, u.department AS created_by_dept
        FROM documents d
        JOIN users u ON d.created_by = u.id
        WHERE d.current_location_dept = ?
        ORDER BY d.created_at DESC
      `;
      params = [req.user.department];
    }

    const [rows] = await pool.execute(query, params);

    return res.status(200).json({
      success: true,
      count:   rows.length,
      data:    rows,
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