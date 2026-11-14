import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticate } from '../middleware/auth';
import { handleIdempotency } from '../middleware/idempotency';

const router = Router();

router.post('/:id/accept', authenticate, handleIdempotency, TeamController.acceptRequest);
router.post('/:id/decline', authenticate, TeamController.declineRequest);
router.delete('/:id', authenticate, TeamController.cancelRequest);

export default router;

