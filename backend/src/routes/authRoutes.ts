import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from 'shared';

const router = Router();

router.post('/register', validate(RegisterSchema), AuthController.register);
router.post('/login', validate(LoginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validate(UpdateProfileSchema), AuthController.updateProfile);

export default router;
