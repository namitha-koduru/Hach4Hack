import { Router } from 'express';
import { HackathonController } from '../controllers/hackathonController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', HackathonController.list);
router.get('/:id', HackathonController.getById);
router.post('/', authenticate, requireRole('ADMIN'), HackathonController.create);

export default router;

