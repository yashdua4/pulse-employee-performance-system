import { Router } from 'express';
import { clockIn, clockOut, getAttendanceLogs, getTodayStatus } from '../controllers/attendance.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAttendanceLogs);
router.get('/today', getTodayStatus);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);

export default router;
