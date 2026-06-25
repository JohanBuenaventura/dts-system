// src/controllers/routing.controller.js
import pool from '../config/db.js';

// ─── FORWARD TO MULTIPLE DEPARTMENTS / SPECIFIC USER (MATRIX ROUTING) ────────
export const forwardDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { destinations = [], remarks } = req.body;
    const performedBy = req.user;

    if (!destinations || destinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one destination department is required.',
      });
    }

    // Fetch the document first
    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // FIXED: Admin Creator Override applied here
    if (performedBy.role === 'Admin' && document.created_by !== performedBy.id) {
      return res.status(403).json({
        success: false,
        message: 'Admins are view-only. You can only forward documents you created yourself.',
      });
    }

    if (document.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward a fully completed document.',
      });
    }

    const from_department = document.current_location_dept;

    // Filter out current department from destinations
    const validDestinations = destinations.filter(d => d.department && d.department !== from_department);
    if (validDestinations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot forward to the same department the document is currently in.',
      });
    }

    // Validate specific users if provided
    for (const dest of validDestinations) {
      if (dest.to_user_id) {
        const [userRows] = await pool.execute(
          'SELECT id, department FROM users WHERE id = ? AND is_active = 1', [dest.to_user_id]
        );
        if (userRows.length === 0) {
          return res.status(404).json({ success: false, message: `Target user not found for department ${dest.department}.` });
        }
        if (userRows[0].department !== dest.department) {
          return res.status(400).json({
            success: false,
            message: `Specified user does not belong to the ${dest.department} department.`,
          });
        }
      }
    }

    // Update document status globally to In Transit
    // If multiple destinations, label location as 'Multiple Departments'
    const multiDeptLocation = validDestinations.length > 1 ? 'Multiple Departments' : validDestinations[0].department;
    
    await pool.execute(
      `UPDATE documents SET status = 'In Transit', current_location_dept = ? WHERE id = ?`,
      [multiDeptLocation, id]
    );

    // Insert recipient tracking item per destination department
    for (const dest of validDestinations) {
      const targetUserId = dest.to_user_id || null;

      await pool.execute(
        `INSERT INTO document_recipients
          (document_id, department, user_id, status)
         VALUES (?, ?, ?, 'Pending')`,
        [id, dest.department, targetUserId]
      );

      await pool.execute(
        `INSERT INTO document_logs
          (document_id, action_taken, from_department, to_department, remarks, to_user_id, performed_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          `Forwarded to ${dest.department}${targetUserId ? ' (specific user)' : ''}`,
          from_department,
          dest.department,
          remarks || null,
          targetUserId,
          performedBy.id,
        ]
      );
    }

    const deptNames = validDestinations.map(d => d.department).join(', ');

    return res.status(200).json({
      success: true,
      message: `Document forwarded to ${deptNames}.`,
      data: {
        document_id:   id,
        from:          from_department,
        to:            validDestinations.map(d => d.department),
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

    const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // FIXED: Admin Creator Override applied here
    if (performedBy.role === 'Admin' && document.created_by !== performedBy.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admins are view-only. You can only receive documents you created yourself.' 
      });
    }

    const [recipientRows] = await pool.execute(
      `SELECT id FROM document_recipients WHERE document_id = ? AND department = ? AND status = 'Pending'`,
      [id, performedBy.department]
    );

    if (recipientRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Not pending for your department.' });
    }

    // 1. Update ONLY this specific department's row to 'Received'
    await pool.execute(
      `UPDATE document_recipients SET status = 'Received', responded_at = NOW(), remarks = ?
       WHERE document_id = ? AND department = ? AND status = 'Pending'`,
      [remarks || null, id, performedBy.department]
    );

    // 2. FIXED: DYNAMIC GLOBAL STATUS RECALCULATION
    const [pending] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Pending'`, [id]);
    const [received] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Received'`, [id]);

    if (pending.length > 0) {
      // If ANY department has not received it yet, global status must remain 'In Transit'
      await pool.execute(`UPDATE documents SET status = 'In Transit' WHERE id = ?`, [id]);
    } else if (received.length > 0) {
      // No one is pending, so we can finally globally mark it as 'Received'
      await pool.execute(`UPDATE documents SET status = 'Received' WHERE id = ?`, [id]);
    }

    await pool.execute(
      `INSERT INTO document_logs (document_id, action_taken, from_department, to_department, remarks, performed_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, `Received by ${performedBy.department}`, document.current_location_dept, performedBy.department, remarks || null, performedBy.id]
    );

    return res.status(200).json({ success: true, message: 'Document received successfully.' });

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

    if (!remarks || remarks.trim() === '') {
      return res.status(400).json({ success: false, message: 'Remarks are required when rejecting.' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // FIXED: Admin Creator Override applied here
    if (performedBy.role === 'Admin' && document.created_by !== performedBy.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admins are view-only. You can only reject documents you created yourself.' 
      });
    }

    const [recipientRows] = await pool.execute(
      `SELECT id FROM document_recipients 
       WHERE document_id = ? AND department = ? AND status IN ('Pending', 'Received')`,
      [id, performedBy.department]
    );

    if (recipientRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject documents currently assigned or pending for your department.',
      });
    }

    const [logRows] = await pool.execute(
      `SELECT from_department FROM document_logs
       WHERE document_id = ? AND from_department IS NOT NULL
       ORDER BY timestamp DESC LIMIT 1`,
      [id]
    );

    const returnToDept = logRows.length > 0 ? logRows[0].from_department : document.current_location_dept;

    // 1. Update ONLY this department's row to Rejected
    await pool.execute(
      `UPDATE document_recipients
       SET status = 'Rejected', responded_at = NOW(), remarks = ?
       WHERE document_id = ? AND department = ? AND status IN ('Pending', 'Received')`,
      [remarks, id, performedBy.department]
    );

    // 2. FIXED: DYNAMIC GLOBAL STATUS RECALCULATION
    const [pending] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Pending'`, [id]);
    const [received] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Received'`, [id]);

    if (pending.length > 0) {
      // If ANY department has not received it yet, global status must remain 'In Transit'
      await pool.execute(`UPDATE documents SET status = 'In Transit' WHERE id = ?`, [id]);
    } else if (received.length > 0) {
      // No one is pending, but some departments are still actively working on it
      await pool.execute(`UPDATE documents SET status = 'Received' WHERE id = ?`, [id]);
    } else {
      // EVERY active department has finished (or rejected)
      await pool.execute(`UPDATE documents SET status = 'Completed' WHERE id = ?`, [id]);
    }

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, remarks, performed_by_user_id)
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

    const [rows] = await pool.execute(
      'SELECT * FROM documents WHERE id = ?', [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const document = rows[0];

    // FIXED: Admin Creator Override applied here
    if (performedBy.role === 'Admin' && document.created_by !== performedBy.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Admins are view-only. You can only complete documents you created yourself.' 
      });
    }

    const [recipientRows] = await pool.execute(
      `SELECT id FROM document_recipients 
       WHERE document_id = ? AND department = ? AND status = 'Received'`,
      [id, performedBy.department]
    );

    if (recipientRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You can only complete a document that has been actively received by your department.',
      });
    }

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

    // 1. Update ONLY this department's recipient instance tracking row to Completed
    await pool.execute(
      `UPDATE document_recipients
       SET status = 'Completed', responded_at = NOW(), remarks = ?
       WHERE document_id = ? AND department = ? AND status = 'Received'`,
      [remarks || null, id, performedBy.department]
    );

    // 2. FIXED: DYNAMIC GLOBAL STATUS RECALCULATION
    const [pending] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Pending'`, [id]);
    const [received] = await pool.execute(`SELECT id FROM document_recipients WHERE document_id = ? AND status = 'Received'`, [id]);

    if (pending.length > 0) {
      // If ANY department has not received it yet, global status must remain 'In Transit'
      await pool.execute(`UPDATE documents SET status = 'In Transit' WHERE id = ?`, [id]);
    } else if (received.length > 0) {
      // No one is pending, but some departments are still actively working on it
      await pool.execute(`UPDATE documents SET status = 'Received' WHERE id = ?`, [id]);
    } else {
      // EVERY active department has finished (or rejected)
      await pool.execute(`UPDATE documents SET status = 'Completed' WHERE id = ?`, [id]);
    }

    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, remarks, performed_by_user_id)
       VALUES (?, ?, ?, NULL, ?, ?)`,
      [id, `Document Completed by ${performedBy.department}`, document.current_location_dept, remarks || null, performedBy.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Document marked as completed for your department.',
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