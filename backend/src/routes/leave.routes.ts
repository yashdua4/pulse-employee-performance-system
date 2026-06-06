import { Router } from 'express';
import { 
  applyLeave, 
  cancelLeave, 
  approveLeave, 
  rejectLeave, 
  getLeaveRequests,
  getLeaveBalances
} from '../controllers/leave.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { applyLeaveSchema } from '../validations/leave.validation.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/balances', getLeaveBalances);
router.get('/', getLeaveRequests);
router.post('/apply', validateRequest(applyLeaveSchema), applyLeave);
router.delete('/:id/cancel', cancelLeave);

// Manager / Admin approvals
router.post('/:id/approve', requireRoles([Role.ADMIN, Role.MANAGER]), approveLeave);
router.post('/:id/reject', requireRoles([Role.ADMIN, Role.MANAGER]), rejectLeave);

export default router;
