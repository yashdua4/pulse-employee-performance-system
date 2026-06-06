import { Router } from 'express';
import { 
  getAllDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../controllers/department.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getAllDepartments);

// Admin only operations
router.post('/', requireRoles([Role.ADMIN]), createDepartment);
router.put('/:id', requireRoles([Role.ADMIN]), updateDepartment);
router.delete('/:id', requireRoles([Role.ADMIN]), deleteDepartment);

export default router;
