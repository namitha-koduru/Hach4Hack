import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticate, optionalAuthenticate, requireLeaderOrAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { handleIdempotency } from '../middleware/idempotency';
import {
  CreateTeamSchema,
  UpdateTeamSchema,
  CreateInviteSchema,
  CreateJoinRequestSchema,
  TeamFilterQuerySchema,
} from 'shared';

const router = Router();

// Team CRUD & Discovery
router.post(
  '/',
  authenticate,
  validate(CreateTeamSchema),
  handleIdempotency,
  TeamController.createTeam
);

router.get(
  '/',
  optionalAuthenticate,
  validate(TeamFilterQuerySchema, 'query'),
  TeamController.listTeams
);

router.get('/:id', optionalAuthenticate, TeamController.getTeamById);
router.patch('/:id', authenticate, requireLeaderOrAdmin, validate(UpdateTeamSchema), TeamController.updateTeam);
router.delete('/:id', authenticate, requireLeaderOrAdmin, TeamController.deleteTeam);

// Membership Operations
router.post('/:id/join', authenticate, handleIdempotency, TeamController.directJoin);
router.post('/:id/leave', authenticate, TeamController.leaveTeam);
router.delete('/:id/members/:userId', authenticate, TeamController.removeMember);

// Invitations (Team Scoped)
router.post(
  '/:id/invites',
  authenticate,
  requireLeaderOrAdmin,
  validate(CreateInviteSchema),
  TeamController.createInvite
);

// Join Requests (Team Scoped)
router.post(
  '/:id/requests',
  authenticate,
  validate(CreateJoinRequestSchema),
  handleIdempotency,
  TeamController.createRequest
);

router.get('/:id/requests', authenticate, requireLeaderOrAdmin, TeamController.getRequests);

// Teammate Suggestions & Recommendations
router.get('/:id/suggestions', authenticate, TeamController.getSuggestions);

// Audit Log
router.get('/:id/audit', authenticate, TeamController.getAuditLogs);

export default router;
