import { Router } from 'express';
import authRoutes from './auth.routes.js';
import employeeRoutes from './employee.routes.js';
import projectRoutes from './project.routes.js';
import attendanceRoutes from './attendance.routes.js';
import reviewRoutes from './review.routes.js';
import departmentRoutes from './department.routes.js';
import leaveRoutes from './leave.routes.js';
import notificationRoutes from './notification.routes.js';
import analyticsRoutes from './analytics.routes.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/projects', projectRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reviews', reviewRoutes);
router.use('/departments', departmentRoutes);
router.use('/leaves', leaveRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);

router.get('/dashboard/stats', authenticate, getDashboardStats);

export default router;
