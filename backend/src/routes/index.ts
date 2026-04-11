import { Router } from 'express';
import authRoutes from './auth';
import companiesHouseRoutes from './companiesHouse';
import clientRoutes from './clients';
import riskAssessmentRoutes from './riskAssessments';
import documentRoutes from './documents';
import auditRoutes from './audit';
import reportRoutes from './reports';
import teamRoutes from './team';
import apiRoutes from './api';
import chatRoutes from './chat';
import portalRoutes from './portal';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Routes
router.use('/auth', authRoutes);
router.use('/ch', companiesHouseRoutes);
router.use('/clients', clientRoutes);
router.use('/risk-assessments', riskAssessmentRoutes);
router.use('/documents', documentRoutes);
router.use('/audit', auditRoutes);
router.use('/reports', reportRoutes);
router.use('/team', teamRoutes);
router.use('/v1', apiRoutes);
router.use('/chat', chatRoutes);
router.use('/portal', portalRoutes);

export default router;
