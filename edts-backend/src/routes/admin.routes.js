// src/routes/admin.routes.js
import { Router } from 'express';
import {
  getAllUsers,
  createUser,
  updateUser,
  resetUserPassword,
  toggleUserStatus,
  deleteUser,
  getAllDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getSystemStats,
} from '../controllers/admin.controller.js';
import { protect, superAdminOnly } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, superAdminOnly);

// ── User routes
router.get('/users',                    getAllUsers);
router.post('/users',                   createUser);
router.put('/users/:id',                updateUser);
router.patch('/users/:id/password',     resetUserPassword);
router.patch('/users/:id/toggle',       toggleUserStatus);
router.delete('/users/:id',             deleteUser);

// ── Department routes
router.get('/departments',              getAllDepartments);
router.post('/departments',             createDepartment);
router.put('/departments/:id',          updateDepartment);
router.delete('/departments/:id',       deleteDepartment);

// ── Stats
router.get('/stats',                    getSystemStats);

export default router;