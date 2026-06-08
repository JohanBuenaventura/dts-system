// src/controllers/attachment.controller.js
import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

// ─── UPLOAD ATTACHMENTS ───────────────────────────────────────────────────────
export const uploadAttachments = async (req, res) => {
  try {
    const { id: document_id } = req.params;
    const uploaded_by         = req.user.id;

    // Verify document exists
    const [docRows] = await pool.execute(
      'SELECT id FROM documents WHERE id = ?', [document_id]
    );
    if (docRows.length === 0) {
      // Clean up uploaded files if doc not found
      req.files?.forEach(f => fs.unlinkSync(f.path));
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    // Insert each file record
    const inserted = [];
    for (const file of req.files) {
      const [result] = await pool.execute(
        `INSERT INTO document_attachments
          (document_id, file_name, file_path, file_type, file_size, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          document_id,
          file.originalname,
          file.filename,       // Store only filename, not full path
          file.mimetype,
          file.size,
          uploaded_by,
        ]
      );
      inserted.push({
        id:          result.insertId,
        file_name:   file.originalname,
        file_type:   file.mimetype,
        file_size:   file.size,
        uploaded_by,
      });
    }

    // Log the upload in audit trail
    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, NULL, NULL, ?)`,
      [
        document_id,
        `${req.files.length} file(s) attached: ${req.files.map(f => f.originalname).join(', ')}`,
        uploaded_by,
      ]
    );

    return res.status(201).json({
      success: true,
      message: `${inserted.length} file(s) uploaded successfully.`,
      data:    inserted,
    });

  } catch (error) {
    // Clean up files on error
    req.files?.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    console.error('[UPLOAD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during upload.' });
  }
};

// ─── GET ATTACHMENTS FOR A DOCUMENT ──────────────────────────────────────────
export const getAttachments = async (req, res) => {
  try {
    const { id: document_id } = req.params;

    const [rows] = await pool.execute(
      `SELECT da.*, u.full_name AS uploaded_by_name
       FROM document_attachments da
       JOIN users u ON da.uploaded_by = u.id
       WHERE da.document_id = ?
       ORDER BY da.uploaded_at DESC`,
      [document_id]
    );

    return res.status(200).json({ success: true, count: rows.length, data: rows });

  } catch (error) {
    console.error('[GET ATTACHMENTS ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ─── DOWNLOAD / VIEW ATTACHMENT ───────────────────────────────────────────────
export const downloadAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;

    const [rows] = await pool.execute(
      'SELECT * FROM document_attachments WHERE id = ?',
      [attachmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const attachment = rows[0];
    const filePath   = path.resolve(`uploads/documents/${attachment.file_path}`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File no longer exists on server.' });
    }

    // Set headers so browser handles PDF/image inline, others as download
    const inlineTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    const disposition = inlineTypes.includes(attachment.file_type)
      ? `inline; filename="${attachment.file_name}"`
      : `attachment; filename="${attachment.file_name}"`;

    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Type', attachment.file_type);

    return res.sendFile(filePath);

  } catch (error) {
    console.error('[DOWNLOAD ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error during download.' });
  }
};

// ─── DELETE ATTACHMENT ────────────────────────────────────────────────────────
export const deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const requestingUser   = req.user;

    const [rows] = await pool.execute(
      'SELECT * FROM document_attachments WHERE id = ?',
      [attachmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const attachment = rows[0];

    // Only uploader or Super Admin can delete
    if (attachment.uploaded_by !== requestingUser.id && requestingUser.role !== 'Super Admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own attachments.',
      });
    }

    // Delete file from disk
    const filePath = path.resolve(`uploads/documents/${attachment.file_path}`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await pool.execute(
      'DELETE FROM document_attachments WHERE id = ?', [attachmentId]
    );

    // Log deletion in audit trail
    await pool.execute(
      `INSERT INTO document_logs
        (document_id, action_taken, from_department, to_department, performed_by_user_id)
       VALUES (?, ?, NULL, NULL, ?)`,
      [attachment.document_id, `Attachment deleted: ${attachment.file_name}`, requestingUser.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully.',
    });

  } catch (error) {
    console.error('[DELETE ATTACHMENT ERROR]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};