import { Router } from 'express';
import { 
  getAllEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee,
  getManagersList,
  bulkImportEmployees
} from '../controllers/employee.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { createEmployeeSchema, updateEmployeeSchema } from '../validations/employee.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Directory lists and manager selection are available to authenticated users
router.get('/', getAllEmployees);
router.get('/managers', getManagersList);
router.get('/:id', getEmployeeById);

// Admin-only operations
router.post('/bulk-import', requireRoles([Role.ADMIN]), bulkImportEmployees);
router.post('/', requireRoles([Role.ADMIN]), validateRequest(createEmployeeSchema), createEmployee);
router.put('/:id', requireRoles([Role.ADMIN]), validateRequest(updateEmployeeSchema), updateEmployee);
router.delete('/:id', requireRoles([Role.ADMIN]), deleteEmployee);

export default router;
