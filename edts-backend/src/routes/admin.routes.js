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
  archiveDepartment,
  deleteDepartment,
  getSystemLogs,
  clearOldLogs,
  getSystemStats,
} from '../controllers/admin.controller.js';
import { protect, superAdminOnly } from '../middleware/auth.middleware.js';

const router = Router();

router.use(protect, superAdminOnly);

// Users
router.get('/users',                    getAllUsers);
router.post('/users',                   createUser);
router.put('/users/:id',                updateUser);
router.patch('/users/:id/password',     resetUserPassword);
router.patch('/users/:id/toggle',       toggleUserStatus);
router.delete('/users/:id',             deleteUser);

// Departments
router.get('/departments',              getAllDepartments);
router.post('/departments',             createDepartment);
router.put('/departments/:id',          updateDepartment);
router.patch('/departments/:id/archive', archiveDepartment);
router.delete('/departments/:id',       deleteDepartment);

// Logs
router.get('/logs',                     getSystemLogs);
router.delete('/logs/clear',            clearOldLogs);

// Stats
router.get('/stats',                    getSystemStats);

import { getPendingUsers, decideUserApproval } from '../controllers/admin.controller.js';
// Pending Approval
router.get('/pending',           getPendingUsers);
router.patch('/pending/:id',     decideUserApproval);

export default router;