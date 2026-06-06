import { Router } from 'express';
import { getAuditLogs, getReports, getChartAnalytics } from '../controllers/analytics.controller.js';
import { authenticate, requireRoles } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Reports available to Managers & Admins
router.get('/reports', requireRoles([Role.ADMIN, Role.MANAGER]), getReports);

// Audit logs restricted to Admin only
router.get('/audit-logs', requireRoles([Role.ADMIN]), getAuditLogs);

// Aggregated charts data for Dashboard
router.get('/charts', requireRoles([Role.ADMIN, Role.MANAGER]), getChartAnalytics);

export default router;
