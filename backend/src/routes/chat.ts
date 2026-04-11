import { Router } from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import * as nlpService from '../services/ai/nlpService';
import { createError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chat endpoint
router.post(
  '/',
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      const { message } = req.body;

      if (!userId) {
        throw createError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const response = await nlpService.processQuery(message, userId);

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Generate risk narrative
router.get('/risk-narrative/:clientId', async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { clientId } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const narrative = await nlpService.generateRiskNarrative(clientId);

    res.json({
      success: true,
      data: { narrative },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
