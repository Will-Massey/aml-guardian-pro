import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

/**
 * Authenticate API requests using API key
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get API key from header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Include X-API-Key header.',
        },
      });
      return;
    }

    // Find API key in database
    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    if (!keyRecord) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key.',
        },
      });
      return;
    }

    // Check if key is active
    if (!keyRecord.isActive) {
      res.status(401).json({
        success: false,
        error: {
          code: 'REVOKED_API_KEY',
          message: 'API key has been revoked.',
        },
      });
      return;
    }

    // Check expiry
    if (keyRecord.expiresAt && new Date() > keyRecord.expiresAt) {
      res.status(401).json({
        success: false,
        error: {
          code: 'EXPIRED_API_KEY',
          message: 'API key has expired.',
        },
      });
      return;
    }

    // Update last used
    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Attach user to request
    req.user = {
      userId: keyRecord.user.id,
      email: keyRecord.user.email,
      role: keyRecord.user.role,
      firmName: keyRecord.user.firmName,
    };

    // Log API access
    logger.debug('API request authenticated', {
      apiKeyId: keyRecord.id,
      userId: keyRecord.user.id,
      path: req.path,
    });

    next();
  } catch (error) {
    next(error);
  }
}
