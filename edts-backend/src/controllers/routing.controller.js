// src/controllers/routing.controller.js
import pool from '../config/db.js';

// ─── FORWARD DOCUMENT ─────────────────────────────────────────────────────────
// Sends a document from current location to another department
export const forwardDocument = async (req, res) => {
  try {
    const { id }              = req.params;
    const { to_department }   = req.body;
    const performedBy         = req.user;

    if (!to_department) {
      return res.status(400).json({
        success: false,
        message: 'to_department is required.',
      });
    }

    // ── Fetch the document
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // ── Prevent forwarding a completed document
    if (document.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward a completed document.',
      });
    }

    // ── Prevent forwarding to the same department
    if (document.current_location_dept === to_department) {
      return res.status(400).json({
        success: false,
        message: 'Document is already in that department.',
      });
    }

    const from_department = document.current_location_dept;

    // ── Update document status and location
    await pool.execute(
      `UPDATE documents 
       SET status = 'In Transit', current_location_dept = ?
       WHERE id = ?`,
      [to_department, id]
    );

    // ── Write audit log
    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, `Forwarded to ${to_department}`, from_department, to_department, performedBy.id]
    );

    return res.status(200).json({
      success: true,
      message: `Document forwarded to ${to_department}.`,
      data: {
        document_id:          id,
        from_department,
        to_department,
        new_status:           'In Transit',
        forwarded_by:         performedBy.full_name,
      },
    });

  } catch (error) {
    console.error('[FORWARD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during forwarding.' });
  }
};

// ─── RECEIVE DOCUMENT ─────────────────────────────────────────────────────────
// Acknowledges receipt — updates location to the receiving user's department
export const receiveDocument = async (req, res) => {
  try {
    const { id }      = req.params;
    const performedBy = req.user;

    // ── Fetch document
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // ── Only receive if currently "In Transit"
    if (document.status !== 'In Transit') {
      return res.status(400).json({
        success: false,
        message: `Document cannot be received. Current status is "${document.status}".`,
      });
    }

    // ── Confirm receiving dept matches the document's current target dept
    if (document.current_location_dept !== performedBy.department) {
      return res.status(403).json({
        success: false,
        message: `This document is addressed to "${document.current_location_dept}", not your department.`,
      });
    }

    // ── Update status to Received
    await pool.execute(
      `UPDATE documents SET status = 'Received' WHERE id = ?`,
      [id]
    );

    // ── Write audit log
    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, `Received by ${performedBy.department}`, document.current_location_dept, performedBy.department, performedBy.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Document received successfully.',
      data: {
        document_id:  id,
        received_by:  performedBy.full_name,
        department:   performedBy.department,
        new_status:   'Received',
      },
    });

  } catch (error) {
    console.error('[RECEIVE ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during receiving.' });
  }
};

// ─── COMPLETE DOCUMENT ────────────────────────────────────────────────────────
export const completeDocument = async (req, res) => {
  try {
    const { id }      = req.params;
    const performedBy = req.user;

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    if (document.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Document is already completed.' });
    }

    await pool.execute(
      `UPDATE documents SET status = 'Completed' WHERE id = ?`,
      [id]
    );

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, ?, NULL, ?)`,
      [id, 'Document Marked as Completed', document.current_location_dept, performedBy.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Document marked as completed.',
      data: { document_id: id, completed_by: performedBy.full_name },
    });

  } catch (error) {
    console.error('[COMPLETE ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET AUDIT TRAIL ──────────────────────────────────────────────────────────
export const getDocumentHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Verify document exists
    const [docRows] = await pool.execute(
      'SELECT id, tracking_code, title, status FROM documents WHERE id = ?',
      [id]
    );

    if (docRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // ── Fetch all logs with user info joined
    const [logs] = await pool.execute(
      `SELECT 
          dl.id,
          dl.action_taken,
          dl.from_department,
          dl.to_department,
          dl.timestamp,
          u.full_name  AS performed_by,
          u.department AS performer_department,
          u.role       AS performer_role
       FROM document_logs dl
       JOIN users u ON dl.performed_by_user_id = u.id
       WHERE dl.document_id = ?
       ORDER BY dl.timestamp ASC`,
      [id]
    );

    return res.status(200).json({
      success:  true,
      document: docRows[0],
      count:    logs.length,
      history:  logs,
    });

  } catch (error) {
    console.error('[HISTORY ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error fetching history.' });
  }
};