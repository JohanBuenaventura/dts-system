// src/routes/routing.routes.js
import { Router } from 'express';
import {
  forwardDocument,
  receiveDocument,
  completeDocument,
  getDocumentHistory,
} from '../controllers/routing.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect);

router.post('/:id/forward',  forwardDocument);
router.post('/:id/receive',  receiveDocument);
router.post('/:id/complete', completeDocument);
router.get('/:id/history',   getDocumentHistory);

export default router;