import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as analyticsService from '../services/analytics';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      recentClients,
      riskDistribution,
      pendingDocuments,
      upcomingReviews,
      complianceRate,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({ where: { userId } }),
      
      // Recent clients (30 days)
      prisma.client.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      
      // Risk distribution
      prisma.client.groupBy({
        by: ['riskLevel'],
        where: { userId },
        _count: { riskLevel: true },
      }),
      
      // Pending verification documents
      prisma.document.count({
        where: {
          userId,
          status: 'PENDING_VERIFICATION',
        },
      }),
      
      // Upcoming reviews (next 30 days)
      prisma.client.count({
        where: {
          userId,
          nextReviewDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      
      // Compliance rate (clients with all verifications)
      prisma.client.count({
        where: {
          userId,
          identityVerified: true,
          addressVerified: true,
          pepScreened: true,
          sanctionsScreened: true,
        },
      }),
    ]);

    const totalClientsCount = totalClients || 1; // Avoid division by zero

    res.json({
      success: true,
      data: {
        totalClients,
        recentClients,
        riskDistribution: {
          low: riskDistribution.find(r => r.riskLevel === 'LOW')?._count.riskLevel || 0,
          medium: riskDistribution.find(r => r.riskLevel === 'MEDIUM')?._count.riskLevel || 0,
          high: riskDistribution.find(r => r.riskLevel === 'HIGH')?._count.riskLevel || 0,
        },
        pendingDocuments,
        upcomingReviews,
        complianceRate: Math.round((complianceRate / totalClientsCount) * 100),
      },
    });
  } catch (error) {
    next(error);
  }
}

// === ANALYTICS CONTROLLERS ===

/**
 * Get risk prediction for a client
 */
export async function getRiskPrediction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { clientId } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      throw createError('Client not found', 404, 'NOT_FOUND');
    }

    const prediction = await analyticsService.predictClientRisk(clientId);

    if (!prediction) {
      throw createError('Unable to generate prediction', 400, 'PREDICTION_FAILED');
    }

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get anomaly detections
 */
export async function getAnomalies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const anomalies = await analyticsService.detectAnomalies(userId);

    // Enrich with client names
    const enrichedAnomalies = await Promise.all(
      anomalies.map(async (anomaly) => {
        const client = await prisma.client.findFirst({
          where: { id: anomaly.clientId, userId },
          select: { companyName: true },
        });
        return {
          ...anomaly,
          companyName: client?.companyName,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAnomalies,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get compliance trends
 */
export async function getTrends(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { months = '6' } = req.query;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const trends = await analyticsService.getComplianceTrends(
      userId,
      parseInt(months as string)
    );

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get risk score analysis
 */
export async function getRiskScoreAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const distribution = await analyticsService.getRiskScoreDistribution(userId);

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get compliance report
 */
export async function getComplianceReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { startDate, endDate } = req.query;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate as string);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate as string);
    }

    const [
      clientsByMonth,
      documentsByStatus,
      riskChanges,
      manualOverrides,
    ] = await Promise.all([
      // Clients added by month
      prisma.client.groupBy({
        by: ['createdAt'],
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: { id: true },
      }),
      
      // Documents by status
      prisma.document.groupBy({
        by: ['status', 'type'],
        where: {
          userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
        _count: { id: true },
      }),
      
      // Risk assessment changes
      prisma.riskAssessment.count({
        where: {
          manualOverride: true,
          client: { userId },
          ...(Object.keys(dateFilter).length > 0 && { updatedAt: dateFilter }),
        },
      }),
      
      // Manual override details
      prisma.riskAssessment.findMany({
        where: {
          manualOverride: true,
          client: { userId },
        },
        include: {
          client: {
            select: {
              companyName: true,
            },
          },
        },
        orderBy: { overriddenAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        clientsByMonth,
        documentsByStatus,
        riskChanges,
        manualOverrides: manualOverrides.map(m => ({
          clientName: m.client?.companyName,
          originalRisk: m.overallRiskLevel,
          manualRisk: m.manualRiskLevel,
          reason: m.overrideReason,
          date: m.overriddenAt,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get risk distribution
 */
export async function getRiskDistribution(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const distribution = await prisma.client.groupBy({
      by: ['riskLevel'],
      where: { userId },
      _count: { id: true },
    });

    // Get high risk clients detail
    const highRiskClients = await prisma.client.findMany({
      where: {
        userId,
        riskLevel: 'HIGH',
      },
      include: {
        riskAssessment: {
          select: {
            riskScore: true,
            businessSectorRisk: true,
            geographicRisk: true,
          },
        },
      },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        distribution: {
          low: distribution.find(d => d.riskLevel === 'LOW')?._count.id || 0,
          medium: distribution.find(d => d.riskLevel === 'MEDIUM')?._count.id || 0,
          high: distribution.find(d => d.riskLevel === 'HIGH')?._count.id || 0,
        },
        highRiskClients: highRiskClients.map(c => ({
          id: c.id,
          companyName: c.companyName,
          riskScore: c.riskAssessment?.riskScore,
          factors: {
            business: c.riskAssessment?.businessSectorRisk,
            geographic: c.riskAssessment?.geographicRisk,
          },
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get document status report
 */
export async function getDocumentStatusReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const [statusCounts, typeCounts, expiredSoon] = await Promise.all([
      // Documents by status
      prisma.document.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      
      // Documents by type
      prisma.document.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true },
      }),
      
      // Documents needing renewal (older than 11 months)
      prisma.document.count({
        where: {
          userId,
          status: { in: ['VERIFIED', 'SIGNED'] },
          createdAt: {
            lte: new Date(Date.now() - 335 * 24 * 60 * 60 * 1000), // ~11 months
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        byStatus: statusCounts.map(s => ({
          status: s.status,
          count: s._count.id,
        })),
        byType: typeCounts.map(t => ({
          type: t.type,
          count: t._count.id,
        })),
        expiredSoon,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Export report (placeholder for PDF/Excel generation)
 */
export async function exportReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { type = 'compliance', format = 'json' } = req.query;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get all client data for export
    const clients = await prisma.client.findMany({
      where: { userId },
      include: {
        riskAssessment: true,
        documents: {
          select: {
            type: true,
            status: true,
          },
        },
      },
    });

    const report = {
      generatedAt: new Date().toISOString(),
      firm: req.user?.firmName,
      totalClients: clients.length,
      clients: clients.map(c => ({
        companyName: c.companyName,
        companyNumber: c.companyNumber,
        riskLevel: c.riskLevel,
        riskScore: c.riskAssessment?.riskScore,
        cddType: c.cddType,
        identityVerified: c.identityVerified,
        addressVerified: c.addressVerified,
        pepScreened: c.pepScreened,
        sanctionsScreened: c.sanctionsScreened,
        documentCount: c.documents.length,
      })),
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="compliance-report.json"');
      res.json(report);
    } else {
      // For PDF/Excel, you'd integrate with a library like puppeteer or exceljs
      res.json({
        success: true,
        message: 'Export functionality - JSON format available. PDF/Excel coming soon.',
        data: report,
      });
    }
  } catch (error) {
    next(error);
  }
}
