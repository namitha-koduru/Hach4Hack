import { Router } from 'express';
import authRoutes from './authRoutes';
import hackathonRoutes from './hackathonRoutes';
import teamRoutes from './teamRoutes';
import requestRoutes from './requestRoutes';
import inviteRoutes from './inviteRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'teamforge-backend',
  });
});

router.use('/auth', authRoutes);
router.use('/hackathons', hackathonRoutes);
router.use('/teams', teamRoutes);
router.use('/requests', requestRoutes);
router.use('/invites', inviteRoutes);

export default router;

