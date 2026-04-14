import { Router } from 'express';
import { body } from 'express-validator';
import * as adminController from '../controllers/adminController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { handleValidationErrors } from '../middleware/validation';

const router = Router();

// Public admin auth endpoint (AccountFlow compatible)
router.post(
  '/auth/login',
  [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required'),
    handleValidationErrors,
  ],
  adminController.adminLogin
);

// Protected admin endpoints
const adminAuth = [authenticateToken, requireRole('SUPERADMIN', 'ADMIN')];

router.get('/stats', adminAuth, adminController.getStats);
router.get('/trials', adminAuth, adminController.getTrials);
router.get('/revenue/summary', adminAuth, adminController.getRevenueSummary);
router.get('/revenue', adminAuth, adminController.getRevenue);
router.get('/practices', adminAuth, adminController.getPractices);
router.get('/customers/summary', adminAuth, adminController.getCustomersSummary);
router.get('/email-config', adminAuth, adminController.getEmailConfig);
router.get('/email-stats', adminAuth, adminController.getEmailStats);
router.get('/activities', adminAuth, adminController.getActivities);

router.post(
  '/send-email',
  adminAuth,
  [
    body('to').isEmail().withMessage('Valid email required'),
    body('subject').trim().notEmpty().withMessage('Subject required'),
    handleValidationErrors,
  ],
  adminController.sendEmail
);

router.post('/practices/:id/convert-to-paid', adminAuth, adminController.convertToPaid);
router.post('/trials/:id/extend', adminAuth, adminController.extendTrial);

export default router;
