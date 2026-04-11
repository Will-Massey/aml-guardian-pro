import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as screeningService from '../services/screening';
import { aiRiskAssessmentService } from '../services/ai';

// === CLIENT API ===

export async function createClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { companyName, companyNumber, email, riskLevel, ...clientData } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const client = await prisma.client.create({
      data: {
        companyName,
        companyNumber,
        userId,
        createdBy: userId,
        updatedBy: userId,
        riskLevel: riskLevel || 'MEDIUM',
        ...clientData,
      },
    });

    // Trigger webhook
    await triggerWebhook(userId!, 'client.created', client);

    res.status(201).json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientByCompanyNumber(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { companyNumber } = req.params;

    const client = await prisma.client.findFirst({
      where: { companyNumber, userId },
      include: { riskAssessment: true },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

export async function getClients(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { riskLevel, search, limit = '50', offset = '0' } = req.query;

    const where: any = { userId };

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { companyNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          riskAssessment: {
            select: {
              overallRiskLevel: true,
              riskScore: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    res.json({
      success: true,
      data: clients,
      meta: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: {
        riskAssessment: true,
        documents: true,
      },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...req.body,
        updatedBy: userId,
      },
    });

    await triggerWebhook(userId!, 'client.updated', client);

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

// === DOCUMENT API ===

export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    // TODO: Implement file upload handling for API
    res.status(501).json({
      success: false,
      message: 'Document upload via API coming soon',
    });
  } catch (error) {
    next(error);
  }
}

export async function getClientDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    const documents = await prisma.document.findMany({
      where: { clientId, userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}

// === RISK ASSESSMENT API ===

export async function triggerRiskAssessment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    // Generate AI risk assessment
    const riskData = await aiRiskAssessmentService.assessRisk({
      companyName: client.companyName,
      companyNumber: client.companyNumber || undefined,
      companyType: client.companyType || undefined,
      sicCodes: client.sicCodes,
      businessDescription: client.businessDescription || undefined,
      registeredAddress: client.registeredAddress as any,
      officers: client.officers as any,
      pscs: client.pscs as any,
      incorporationDate: client.incorporationDate || undefined,
    });

    // Create/update risk assessment
    const riskAssessment = await prisma.riskAssessment.create({
      data: {
        overallRiskLevel: riskData.overallRiskLevel!,
        riskScore: riskData.riskScore!,
        businessSectorRisk: riskData.businessSectorRisk!,
        geographicRisk: riskData.geographicRisk!,
        structureRisk: riskData.structureRisk!,
        transparencyRisk: riskData.transparencyRisk!,
        pepRisk: riskData.pepRisk!,
        sanctionsRisk: riskData.sanctionsRisk!,
        riskFactors: riskData.riskFactors as any,
        requiredDocuments: riskData.requiredDocuments as any,
        riskMitigation: riskData.riskMitigation as any,
        ongoingMonitoring: riskData.ongoingMonitoring!,
        aiAnalysis: riskData.aiAnalysis,
        aiGeneratedAt: riskData.aiGeneratedAt!,
        aiModel: riskData.aiModel,
        manualOverride: false,
        riskJustification: riskData.riskJustification,
      },
    });

    // Update client
    await prisma.client.update({
      where: { id: clientId },
      data: {
        riskAssessmentId: riskAssessment.id,
        riskLevel: riskData.overallRiskLevel!,
      },
    });

    await triggerWebhook(userId!, 'risk-assessment.completed', {
      clientId,
      riskAssessment,
    });

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRiskAssessment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: { riskAssessment: true },
    });

    if (!client?.riskAssessment) {
      throw createError('Risk assessment not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: client.riskAssessment,
    });
  } catch (error) {
    next(error);
  }
}

// === SCREENING API ===

export async function screenName(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, birthYear, country } = req.body;

    if (!name) {
      throw createError('Name is required', 400, 'MISSING_NAME');
    }

    const results = await screeningService.screenName(name, birthYear, country);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

export async function screenClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    const results = await screeningService.screenClient(
      client.companyName,
      (client.officers as any[]) || [],
      (client.pscs as any[]) || []
    );

    // Update client screening status
    if (!results.hasMatches) {
      await prisma.client.update({
        where: { id: clientId },
        data: {
          pepScreened: true,
          sanctionsScreened: true,
        },
      });
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

// === COMPLIANCE API ===

export async function getComplianceStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id: clientId } = req.params;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: { documents: true, riskAssessment: true },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    const status = {
      clientId,
      companyName: client.companyName,
      overallStatus: client.identityVerified && client.addressVerified ? 'COMPLIANT' : 'NON_COMPLIANT',
      checks: {
        identityVerified: client.identityVerified,
        addressVerified: client.addressVerified,
        pepScreened: client.pepScreened,
        sanctionsScreened: client.sanctionsScreened,
        riskAssessment: !!client.riskAssessment,
        documents: {
          total: client.documents.length,
          verified: client.documents.filter(d => d.status === 'VERIFIED').length,
        },
      },
      nextReviewDate: client.nextReviewDate,
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
}

export async function getComplianceSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const [
      totalClients,
      compliantClients,
      pendingDocuments,
      upcomingReviews,
      riskDistribution,
    ] = await Promise.all([
      prisma.client.count({ where: { userId } }),
      prisma.client.count({
        where: {
          userId,
          identityVerified: true,
          addressVerified: true,
        },
      }),
      prisma.document.count({
        where: { userId, status: 'PENDING_VERIFICATION' },
      }),
      prisma.client.count({
        where: {
          userId,
          nextReviewDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.client.groupBy({
        by: ['riskLevel'],
        where: { userId },
        _count: { riskLevel: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        compliantClients,
        complianceRate: totalClients > 0 ? Math.round((compliantClients / totalClients) * 100) : 0,
        pendingDocuments,
        upcomingReviews,
        riskDistribution: {
          low: riskDistribution.find(r => r.riskLevel === 'LOW')?._count.riskLevel || 0,
          medium: riskDistribution.find(r => r.riskLevel === 'MEDIUM')?._count.riskLevel || 0,
          high: riskDistribution.find(r => r.riskLevel === 'HIGH')?._count.riskLevel || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

// === WEBHOOK API ===

export async function registerWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { url, events } = req.body;

    const webhook = await prisma.webhook.create({
      data: {
        url,
        events,
        userId: userId!,
      },
    });

    res.status(201).json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebhooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    await prisma.webhook.deleteMany({
      where: { id, userId },
    });

    res.json({
      success: true,
      message: 'Webhook deleted',
    });
  } catch (error) {
    next(error);
  }
}

// === API KEY MANAGEMENT ===

export async function generateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { name, expiresInDays } = req.body;

    // Generate secure key
    const key = 'aml_' + crypto.randomBytes(32).toString('hex');

    const apiKey = await prisma.apiKey.create({
      data: {
        key,
        name: name || 'API Key',
        userId: userId!,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: apiKey.id,
        key, // Only shown once!
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      },
      message: 'Store this key securely - it will not be shown again!',
    });
  } catch (error) {
    next(error);
  }
}

export async function getApiKeys(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    await prisma.apiKey.updateMany({
      where: { id, userId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'API key revoked',
    });
  } catch (error) {
    next(error);
  }
}

// === WEBHOOK TRIGGER HELPER ===

async function triggerWebhook(
  userId: string,
  event: string,
  data: any
): Promise<void> {
  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      try {
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event,
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data,
          }),
        });

        await prisma.webhook.update({
          where: { id: webhook.id },
          data: { lastTriggeredAt: new Date() },
        });
      } catch (error) {
        logger.error('Webhook delivery failed', { webhookId: webhook.id, error });
      }
    }
  } catch (error) {
    logger.error('Webhook trigger error', error);
  }
}
