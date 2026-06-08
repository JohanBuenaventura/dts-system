// src/routes/attachment.routes.js
import { Router } from 'express';
import {
  uploadAttachments,
  getAttachments,
  downloadAttachment,
  deleteAttachment,
} from '../controllers/attachment.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import upload from '../config/multer.js';

const router = Router();

router.use(protect);

// Upload files to a document (max 5 files)
router.post('/:id/attachments',              upload.array('files', 5), uploadAttachments);

// Get all attachments for a document
router.get('/:id/attachments',               getAttachments);

// Download/view a single attachment
router.get('/attachments/:attachmentId',     downloadAttachment);

// Delete an attachment
router.delete('/attachments/:attachmentId',  deleteAttachment);

export default router;