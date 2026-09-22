import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import {
  disableMfa,
  exportSecurityReport,
  getDataAccessLogs,
  getPermissionMatrix,
  getSecurityDashboard,
  getSecurityStatus,
  getSecuritySummary,
  getSuspiciousActivities,
  setupMfa,
  verifyMfa,
} from '../controllers/security.controller.js';

const router = Router();

router.use(authenticate);

router.get('/summary', getSecuritySummary);
router.post('/mfa/setup', setupMfa);
router.post('/mfa/verify', verifyMfa);
router.post('/mfa/disable', disableMfa);

router.get('/dashboard', requireRoles([Role.ADMIN]), getSecurityDashboard);
router.get('/status', requireRoles([Role.ADMIN]), getSecurityStatus);
router.get('/permissions', requireRoles([Role.ADMIN]), getPermissionMatrix);
router.get('/suspicious-activities', requireRoles([Role.ADMIN]), getSuspiciousActivities);
router.get('/data-access-logs', requireRoles([Role.ADMIN]), getDataAccessLogs);
router.get('/export', requireRoles([Role.ADMIN]), exportSecurityReport);

export default router;
