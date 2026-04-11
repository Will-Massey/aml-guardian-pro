import { Router } from 'express';
import { body, param } from 'express-validator';
import * as riskAssessmentController from '../controllers/riskAssessmentController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const overrideValidation = [
  body('manualRiskLevel').isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Valid risk level required'),
  body('overrideReason').isLength({ min: 10 }).withMessage('Override reason must be at least 10 characters'),
  handleValidationErrors,
];

const idValidation = [
  param('id').isUUID().withMessage('Valid risk assessment ID required'),
  handleValidationErrors,
];

// Routes
router.get('/:id', idValidation, riskAssessmentController.getRiskAssessment);
router.post('/:id/regenerate', idValidation, riskAssessmentController.regenerateRiskAssessment);
router.post('/:id/override', idValidation, overrideValidation, riskAssessmentController.overrideRiskAssessment);
router.post('/preview', riskAssessmentController.previewRiskAssessment);

export default router;
