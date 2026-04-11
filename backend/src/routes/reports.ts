import { Router } from 'express';
import { query } from 'express-validator';
import * as reportController from '../controllers/reportController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  handleValidationErrors,
];

// Routes
router.get('/dashboard', reportController.getDashboardStats);
router.get('/compliance', dateRangeValidation, reportController.getComplianceReport);
router.get('/risk-distribution', reportController.getRiskDistribution);
router.get('/document-status', reportController.getDocumentStatusReport);
router.get('/export', dateRangeValidation, reportController.exportReport);

// Analytics routes
router.get('/analytics/predictions/:clientId', reportController.getRiskPrediction);
router.get('/analytics/anomalies', reportController.getAnomalies);
router.get('/analytics/trends', reportController.getTrends);
router.get('/analytics/risk-scores', reportController.getRiskScoreAnalysis);

export default router;
