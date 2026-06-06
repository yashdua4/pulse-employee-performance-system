import { Router } from 'express';
import { 
  signup, 
  login, 
  refreshTokenRotation, 
  changePassword, 
  forgotPassword, 
  resetPassword, 
  logout, 
  getMe 
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshTokenRotation);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);

// Authenticated routes
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
