import express from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post('/register', authLimiter, registerUser);
router.post('/login', authLimiter, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

export default router;
