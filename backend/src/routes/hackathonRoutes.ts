import { Router } from 'express';
import { HackathonController } from '../controllers/hackathonController';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { CreateAnnouncementSchema } from 'shared';

const router = Router();

router.get('/', HackathonController.list);
router.get('/:id', HackathonController.getById);
router.post('/', authenticate, requireRole('ADMIN'), HackathonController.create);

// Looking-for-teammates announcements channel
router.get('/:id/announcements', HackathonController.getAnnouncements);
router.post(
  '/:id/announcements',
  authenticate,
  validate(CreateAnnouncementSchema),
  HackathonController.createAnnouncement
);

export default router;

