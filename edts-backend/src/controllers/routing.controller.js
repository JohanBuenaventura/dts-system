// src/controllers/routing.controller.js
import pool from '../config/db.js';

// ─── FORWARD TO MULTIPLE DEPARTMENTS / SPECIFIC USER ─────────────────────────
export const forwardDocument = async (req, res) => {
  try {
    const { id }                                  = req.params;
    const { departments = [], to_user_id, remarks } = req.body;
    const performedBy                             = req.user;

    // Only Staff and Super Admin can forward
    if (performedBy.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are view-only. Only Staff or Super Admin can forward documents.',
      });
    }

    if (!departments || departments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one destination department is required.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    if (document.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward a completed document.',
      });
    }

    const from_department = document.current_location_dept;

    // Filter out current department from destinations
    const validDepts = departments.filter(d => d !== from_department);
    if (validDepts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward to the same department the document is currently in.',
      });
    }

    // Validate specific user if provided
    if (to_user_id) {
      const [userRows] = await pool.execute(
        'SELECT id, department FROM users WHERE id = ? AND is_active = 1', [to_user_id]
      );
      if (userRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Target user not found.' });
      }
      if (!validDepts.includes(userRows[0].department)) {
        return res.status(400).json({
          success: false,
          message: 'Specified user does not belong to any of the selected departments.',
        });
      }
    }

    // Update document status
    await pool.execute(
      `UPDATE documents SET status = 'In Transit',
        current_location_dept = ?
       WHERE id = ?`,
      [validDepts[0], id]
    );

    // Insert one recipient per department
    for (const dept of validDepts) {
      // Find user in this dept if to_user_id specified and belongs here
      let recipientUserId = null;
      if (to_user_id) {
        const [uRows] = await pool.execute(
          'SELECT id FROM users WHERE id = ? AND department = ?', [to_user_id, dept]
        );
        if (uRows.length > 0) recipientUserId = to_user_id;
      }

      await pool.execute(
        `INSERT INTO document_recipients
          (document_id, department, user_id, status)
         VALUES (?, ?, ?, 'Pending')`,
        [id, dept, recipientUserId || null]
      );

      await pool.execute(
        `INSERT INTO document_logs
          (document_id, action_taken, from_department, to_department,
           remarks, to_user_id, performed_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          `Forwarded to ${dept}${recipientUserId ? ' (specific user)' : ''}`,
          from_department,
          dept,
          remarks || null,
          recipientUserId || null,
          performedBy.id,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: `Document forwarded to ${validDepts.join(', ')}.`,
      data: {
        document_id:   id,
        from:          from_department,
        to:            validDepts,
        forwarded_by:  performedBy.full_name,
        remarks:       remarks || null,
      },
    });

  } catch (error) {
    console.error('[FORWARD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── RECEIVE DOCUMENT ─────────────────────────────────────────────────────────
export const receiveDocument = async (req, res) => {
  try {
    const { id }      = req.params;
    const { remarks } = req.body;
    const performedBy = req.user;

    // Only Staff and Super Admin can receive
    if (performedBy.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are view-only. Only Staff or Super Admin can receive documents.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    if (document.status !== 'In Transit') {
      return res.status(400).json({
        success: false,
        message: `Document cannot be received. Current status: "${document.status}".`,
      });
    }

    if (document.current_location_dept !== performedBy.department) {
      return res.status(403).json({
        success: false,
        message: `This document is addressed to "${document.current_location_dept}", not your department.`,
      });
    }

    // Update document
    await pool.execute(
      `UPDATE documents SET status = 'Received' WHERE id = ?`, [id]
    );

    // Update recipient record
    await pool.execute(
      `UPDATE document_recipients
       SET status = 'Received', responded_at = NOW(), remarks = ?
       WHERE document_id = ? AND department = ? AND status = 'Pending'`,
      [remarks || null, id, performedBy.department]
    );

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department,
         remarks, performed_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        `Received by ${performedBy.department}`,
        document.current_location_dept,
        performedBy.department,
        remarks || null,
        performedBy.id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: 'Document received successfully.',
      data: {
        document_id: id,
        received_by: performedBy.full_name,
        department:  performedBy.department,
        new_status:  'Received',
        remarks:     remarks || null,
      },
    });

  } catch (error) {
    console.error('[RECEIVE ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── REJECT DOCUMENT ──────────────────────────────────────────────────────────
export const rejectDocument = async (req, res) => {
  try {
    const { id }      = req.params;
    const { remarks } = req.body;
    const performedBy = req.user;

    if (performedBy.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are view-only.',
      });
    }

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required when rejecting a document.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    if (document.current_location_dept !== performedBy.department) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject documents in your department.',
      });
    }

    // Return to sender — get previous department from logs
    const [logRows] = await pool.execute(
      `SELECT from_department FROM document_logs
       WHERE document_id = ? AND from_department IS NOT NULL
       ORDER BY timestamp DESC LIMIT 1`,
      [id]
    );

    const returnToDept = logRows.length > 0
      ? logRows[0].from_department
      : document.current_location_dept;

    await pool.execute(
      `UPDATE documents SET status = 'In Transit',
        current_location_dept = ? WHERE id = ?`,
      [returnToDept, id]
    );

    await pool.execute(
      `UPDATE document_recipients
       SET status = 'Rejected', responded_at = NOW(), remarks = ?
       WHERE document_id = ? AND department = ? AND status = 'Pending'`,
      [remarks, id, performedBy.department]
    );

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department,
         remarks, performed_by_user_id)
       VALUES (?, 'Document Rejected — Returned', ?, ?, ?, ?)`,
      [id, performedBy.department, returnToDept, remarks, performedBy.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Document rejected and returned to sender.',
      data: { document_id: id, rejected_by: performedBy.full_name, remarks, returned_to: returnToDept },
    });

  } catch (error) {
    console.error('[REJECT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── COMPLETE DOCUMENT ────────────────────────────────────────────────────────
export const completeDocument = async (req, res) => {
  try {
    const { id }      = req.params;
    const { remarks } = req.body;
    const performedBy = req.user;

    if (performedBy.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins are view-only.',
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    if (document.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Already completed.' });
    }

    // Cannot complete if you are the one who last forwarded it
    const [lastForward] = await pool.execute(
      `SELECT performed_by_user_id FROM document_logs
       WHERE document_id = ? AND action_taken LIKE 'Forwarded%'
       ORDER BY timestamp DESC LIMIT 1`,
      [id]
    );

    if (lastForward.length > 0 &&
        lastForward[0].performed_by_user_id === performedBy.id &&
        document.status === 'In Transit') {
      return res.status(400).json({
        success: false,
        message: 'You cannot complete a document you just forwarded. Wait for the recipient to receive it first.',
      });
    }

    await pool.execute(
      `UPDATE documents SET status = 'Completed' WHERE id = ?`, [id]
    );

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department,
         remarks, performed_by_user_id)
       VALUES (?, 'Document Completed', ?, NULL, ?, ?)`,
      [id, document.current_location_dept, remarks || null, performedBy.id]
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

    const [docRows] = await pool.execute(
      'SELECT id, tracking_code, title, status FROM documents WHERE id = ?', [id]
    );
    if (docRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const [logs] = await pool.execute(
      `SELECT
          dl.id, dl.action_taken, dl.from_department,
          dl.to_department, dl.remarks, dl.timestamp,
          u.full_name  AS performed_by,
          u.department AS performer_department,
          u.role       AS performer_role,
          tu.full_name AS to_user_name
       FROM document_logs dl
       JOIN  users u  ON dl.performed_by_user_id = u.id
       LEFT JOIN users tu ON dl.to_user_id = tu.id
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
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── GET USERS IN A DEPARTMENT (for specific user forwarding) ─────────────────
export const getUsersInDepartment = async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const [rows] = await pool.execute(
      `SELECT id, full_name, email, role
       FROM users
       WHERE department = ? AND is_active = 1
         AND approval_status = 'approved'
         AND role != 'Super Admin'
       ORDER BY full_name ASC`,
      [department]
    );

    return res.status(200).json({ success: true, data: rows });

  } catch (error) {
    console.error('[GET DEPT USERS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};