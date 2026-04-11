import { Router } from 'express';
import { body, param } from 'express-validator';
import * as teamController from '../controllers/teamController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication and ADMIN or MLRO role
router.use(authenticateToken);
router.use(requireRole('ADMIN', 'MLRO'));

// Validation rules
const inviteValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name required'),
  body('role').isIn(['ADMIN', 'MLRO', 'ACCOUNTANT', 'VIEWER']).withMessage('Valid role required'),
  handleValidationErrors,
];

const updateValidation = [
  body('role').optional().isIn(['ADMIN', 'MLRO', 'ACCOUNTANT', 'VIEWER']).withMessage('Valid role required'),
  body('isActive').optional().isBoolean().withMessage('Active status must be boolean'),
  handleValidationErrors,
];

// Routes
router.get('/', teamController.getTeamMembers);
router.post('/invite', inviteValidation, teamController.inviteTeamMember);
router.put('/:id', param('id').isUUID(), updateValidation, teamController.updateTeamMember);
router.delete('/:id', param('id').isUUID(), handleValidationErrors, teamController.removeTeamMember);

export default router;
