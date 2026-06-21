// src/routes/routing.routes.js
import { Router } from 'express';
import {
  forwardDocument,
  receiveDocument,
  rejectDocument,
  completeDocument,
  getDocumentHistory,
  getUsersInDepartment,
} from '../controllers/routing.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

// ── Static routes FIRST ───────────────────────────────────────────────────────
router.get('/users/by-department', getUsersInDepartment);

// ── Dynamic routes ────────────────────────────────────────────────────────────
router.post('/:id/forward',  forwardDocument);
router.post('/:id/receive',  receiveDocument);
router.post('/:id/reject',   rejectDocument);
router.post('/:id/complete', completeDocument);
router.get('/:id/history',   getDocumentHistory);

export default router;