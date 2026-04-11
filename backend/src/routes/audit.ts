import { Router } from 'express';
import { query } from 'express-validator';
import * as auditController from '../controllers/auditController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const listValidation = [
  query('clientId').optional().isUUID().withMessage('Valid client ID required'),
  query('entityType').optional().trim(),
  query('action').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// Routes
router.get('/', listValidation, auditController.getAuditLogs);
router.get('/stats', auditController.getAuditStats);

export default router;
