import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { handleIdempotency } from '../middleware/idempotency';
import { RedeemInviteSchema } from 'shared';

const router = Router();

router.post(
  '/redeem',
  authenticate,
  validate(RedeemInviteSchema),
  handleIdempotency,
  TeamController.redeemInvite
);

router.delete('/:id', authenticate, TeamController.revokeInvite);

export default router;
