// src/routes/document.routes.js
import { Router } from 'express';
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  searchByTrackingCode,
} from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// All document routes require authentication
router.use(protect);

router.get('/',        getAllDocuments);
router.get('/search',  searchByTrackingCode);
router.get('/:id',     getDocumentById);
router.post('/',       createDocument);

export default router;