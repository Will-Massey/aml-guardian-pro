import { Router } from 'express';
import { body, param } from 'express-validator';
import * as clientController from '../controllers/clientController';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../config/database';
import crypto from 'crypto';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Validation rules
const createValidation = [
  body('companyName').optional().trim().notEmpty().withMessage('Company name required if no company number'),
  body('companyNumber').optional().trim(),
  handleValidationErrors,
];

const updateValidation = [
  param('id').isUUID().withMessage('Valid client ID required'),
  body('companyName').optional().trim().notEmpty(),
  handleValidationErrors,
];

// Routes
router.get('/', clientController.getClients);
router.get('/stats', clientController.getClientStats);
router.post('/', createValidation, clientController.createClient);

/**
 * Generate portal access link for a client
 * POST /api/clients/:id/portal-link
 */
router.post(
  '/:id/portal-link',
  param('id').isUUID().withMessage('Valid client ID required'),
  handleValidationErrors,
  async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify client belongs to user
      const client = await prisma.client.findFirst({
        where: { id, userId },
      });

      if (!client) {
        return res.status(404).json({
          success: false,
          error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' },
        });
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // 30 days validity

      // Save token to client
      await prisma.client.update({
        where: { id },
        data: {
          portalToken: token,
          portalTokenExpiry: expiryDate,
          portalEnabled: true,
        },
      });

      // Generate portal URL
      const portalUrl = `${process.env.FRONTEND_URL}/portal?token=${token}`;

      res.json({
        success: true,
        data: {
          portalUrl,
          token,
          expiresAt: expiryDate.toISOString(),
        },
        message: 'Portal link generated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Revoke portal access
 * DELETE /api/clients/:id/portal-link
 */
router.delete(
  '/:id/portal-link',
  param('id').isUUID().withMessage('Valid client ID required'),
  handleValidationErrors,
  async (req: any, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await prisma.client.updateMany({
        where: { id, userId },
        data: {
          portalToken: null,
          portalTokenExpiry: null,
          portalEnabled: false,
        },
      });

      res.json({
        success: true,
        message: 'Portal access revoked',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Standard CRUD routes (must be after specific routes)
router.get('/:id', param('id').isUUID().withMessage('Valid client ID required'), handleValidationErrors, clientController.getClient);
router.put('/:id', updateValidation, clientController.updateClient);
router.delete('/:id', param('id').isUUID().withMessage('Valid client ID required'), handleValidationErrors, clientController.deleteClient);

export default router;
