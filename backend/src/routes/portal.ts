import { Router } from 'express';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const router = Router();

/**
 * Portal authentication middleware
 * Uses secure tokens sent via email
 */
async function authenticatePortalToken(
  req: any,
  res: any,
  next: any
): Promise<void> {
  try {
    const token = req.headers['x-portal-token'] || req.query.token;

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Portal token required' },
      });
      return;
    }

    // Find client by portal token
    const client = await prisma.client.findFirst({
      where: {
        portalToken: token as string,
        portalTokenExpiry: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            firmName: true,
            firmAddress: true,
            firmEmail: true,
            firmPhone: true,
          },
        },
      },
    });

    if (!client) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
      });
      return;
    }

    req.client = client;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Generate portal access link for a client
 * POST /api/clients/:id/portal-link
 */
router.post(
  '/clients/:id/portal-link',
  authenticatePortalToken, // Actually needs user auth, fix this
  async (req, res, next) => {
    try {
      // This should use regular auth, not portal auth
      // Simplified for demo
      res.status(501).json({
        success: false,
        message: 'Portal link generation - requires user authentication',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get client portal data
 * GET /api/portal/client
 */
router.get('/client', authenticatePortalToken, async (req: any, res, next) => {
  try {
    const client = req.client;

    res.json({
      success: true,
      data: {
        companyName: client.companyName,
        companyNumber: client.companyNumber,
        firmName: client.user.firmName,
        firmAddress: client.user.firmAddress,
        firmEmail: client.user.firmEmail,
        firmPhone: client.user.firmPhone,
        requiredDocuments: client.riskAssessment?.requiredDocuments || [],
        uploadedDocuments: await prisma.document.findMany({
          where: { clientId: client.id },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            createdAt: true,
          },
        }),
        complianceStatus: {
          identityVerified: client.identityVerified,
          addressVerified: client.addressVerified,
          pepScreened: client.pepScreened,
          sanctionsScreened: client.sanctionsScreened,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Upload document via portal
 * POST /api/portal/documents
 */
router.post(
  '/documents',
  authenticatePortalToken,
  async (req: any, res, next) => {
    try {
      const client = req.client;
      const { name, type, fileData } = req.body;

      // In production, handle file upload via multer
      // For now, simplified response

      const document = await prisma.document.create({
        data: {
          name,
          type,
          fileName: name,
          filePath: '/uploads/portal/' + name,
          fileSize: 0,
          mimeType: 'application/pdf',
          clientId: client.id,
          userId: client.userId,
          status: 'PENDING_VERIFICATION',
        },
      });

      logger.info('Document uploaded via portal', {
        documentId: document.id,
        clientId: client.id,
      });

      res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded successfully and pending verification',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get upload requirements
 * GET /api/portal/requirements
 */
router.get('/requirements', authenticatePortalToken, async (req: any, res, next) => {
  try {
    const client = req.client;

    const requirements = [];

    if (!client.identityVerified) {
      requirements.push({
        type: 'ID_VERIFICATION',
        title: 'Identity Verification',
        description: 'Please upload a valid passport or driving license',
        acceptedFormats: ['pdf', 'jpg', 'png'],
        required: true,
      });
    }

    if (!client.addressVerified) {
      requirements.push({
        type: 'ADDRESS_VERIFICATION',
        title: 'Address Verification',
        description: 'Please upload a recent utility bill or bank statement (last 3 months)',
        acceptedFormats: ['pdf', 'jpg', 'png'],
        required: true,
      });
    }

    if (!client.pepScreened || !client.sanctionsScreened) {
      requirements.push({
        type: 'PEP_SCREENING',
        title: 'Director Information',
        description: 'Please provide details of all company directors for screening',
        acceptedFormats: ['pdf'],
        required: true,
      });
    }

    res.json({
      success: true,
      data: {
        requirements,
        completed: requirements.length === 0,
        progress: {
          total: requirements.length + 
            [client.identityVerified, client.addressVerified, 
             client.pepScreened, client.sanctionsScreened].filter(Boolean).length,
          completed: [client.identityVerified, client.addressVerified, 
                     client.pepScreened, client.sanctionsScreened].filter(Boolean).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
