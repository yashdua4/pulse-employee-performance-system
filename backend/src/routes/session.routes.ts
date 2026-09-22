import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  deleteSession,
  getSessions,
  logoutAllSessions,
} from '../controllers/security.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getSessions);
router.delete('/:id', deleteSession);
router.post('/logout-all', logoutAllSessions);

export default router;
