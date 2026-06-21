// src/routes/document.routes.js
import { Router } from 'express';
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  searchByTrackingCode,
  getOverdueCount,
  getActiveDepartments, // <-- Added import here
} from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

// ── Static routes FIRST (before /:id) ────────────────────────────────────────
router.get('/search',             searchByTrackingCode);
router.get('/overdue/count',      getOverdueCount);
router.get('/active-departments', getActiveDepartments); // <-- Added route here

// ── General routes
router.get('/',    getAllDocuments);
router.post('/',   createDocument);

// ── Dynamic route LAST ────────────────────────────────────────────────────────
router.get('/:id', getDocumentById);

export default router;