import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiters';
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from 'shared';

const router = Router();

router.post('/register', authLimiter, validate(RegisterSchema), AuthController.register);
router.post('/login', authLimiter, validate(LoginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validate(UpdateProfileSchema), AuthController.updateProfile);

export default router;
