import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { companiesHouseService } from '../services/companiesHouse';
import { aiRiskAssessmentService } from '../services/ai';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { RiskLevel } from '../types';

/**
 * Get all clients for current user
 */
export async function getClients(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { riskLevel, search } = req.query;

    // Build filter
    const where: any = { userId };
    
    if (riskLevel && ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel as string)) {
      where.riskLevel = riskLevel;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { companyNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        riskAssessment: {
          select: {
            overallRiskLevel: true,
            riskScore: true,
            nextReviewDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: clients,
      meta: {
        count: clients.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single client
 */
export async function getClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const client = await prisma.client.findFirst({
      where: { id, userId },
      include: {
        riskAssessment: true,
        documents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create new client with Companies House lookup
 */
export async function createClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { companyNumber, manualEntry } = req.body;

    let clientData: any = {
      userId,
      createdBy: userId,
      updatedBy: userId,
    };

    // If company number provided, fetch from Companies House
    if (companyNumber && !manualEntry) {
      const profile = await companiesHouseService.getFullCompanyProfile(companyNumber);

      if (!profile.company) {
        throw createError('Company not found in Companies House', 404, 'COMPANY_NOT_FOUND');
      }

      const chCompany = profile.company;

      clientData = {
        ...clientData,
        companyName: chCompany.company_name,
        companyNumber: chCompany.company_number,
        companyStatus: chCompany.company_status?.toUpperCase(),
        companyType: chCompany.company_type,
        incorporationDate: chCompany.date_of_creation ? new Date(chCompany.date_of_creation) : null,
        registeredAddress: chCompany.registered_office_address ? {
          addressLine1: chCompany.registered_office_address.address_line_1 || '',
          addressLine2: chCompany.registered_office_address.address_line_2,
          city: chCompany.registered_office_address.locality || '',
          county: chCompany.registered_office_address.region,
          postcode: chCompany.registered_office_address.postal_code || '',
          country: chCompany.registered_office_address.country || 'United Kingdom',
        } : null,
        sicCodes: chCompany.sic_codes || [],
        officers: profile.officers,
        pscs: profile.pscs,
      };
    } else {
      // Manual entry
      const { companyName, registeredAddress, businessDescription } = req.body;
      
      if (!companyName) {
        throw createError('Company name is required', 400, 'MISSING_COMPANY_NAME');
      }

      clientData = {
        ...clientData,
        companyName,
        registeredAddress,
        businessDescription,
        sicCodes: req.body.sicCodes || [],
      };
    }

    // Create client
    const client = await prisma.client.create({
      data: clientData,
    });

    // Auto-generate risk assessment using AI
    try {
      const riskAssessmentData = await aiRiskAssessmentService.assessRisk({
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

      // Create risk assessment
      const riskAssessment = await prisma.riskAssessment.create({
        data: {
          overallRiskLevel: riskAssessmentData.overallRiskLevel!,
          riskScore: riskAssessmentData.riskScore!,
          businessSectorRisk: riskAssessmentData.businessSectorRisk!,
          geographicRisk: riskAssessmentData.geographicRisk!,
          structureRisk: riskAssessmentData.structureRisk!,
          transparencyRisk: riskAssessmentData.transparencyRisk!,
          pepRisk: riskAssessmentData.pepRisk!,
          sanctionsRisk: riskAssessmentData.sanctionsRisk!,
          riskFactors: riskAssessmentData.riskFactors as any,
          requiredDocuments: riskAssessmentData.requiredDocuments as any,
          riskMitigation: riskAssessmentData.riskMitigation as any,
          ongoingMonitoring: riskAssessmentData.ongoingMonitoring!,
          aiAnalysis: riskAssessmentData.aiAnalysis,
          aiGeneratedAt: riskAssessmentData.aiGeneratedAt!,
          aiModel: riskAssessmentData.aiModel,
          manualOverride: riskAssessmentData.manualOverride!,
          riskJustification: riskAssessmentData.riskJustification,
        },
      });

      // Update client with risk assessment
      await prisma.client.update({
        where: { id: client.id },
        data: {
          riskAssessmentId: riskAssessment.id,
          riskLevel: riskAssessmentData.overallRiskLevel || 'MEDIUM',
        },
      });

      logger.info('Client created with AI risk assessment', {
        clientId: client.id,
        companyName: client.companyName,
        riskLevel: riskAssessmentData.overallRiskLevel,
      });

      // Return client with risk assessment
      const clientWithAssessment = await prisma.client.findUnique({
        where: { id: client.id },
        include: { riskAssessment: true },
      });

      res.status(201).json({
        success: true,
        data: clientWithAssessment,
        message: 'Client created successfully with AI risk assessment',
      });
    } catch (aiError) {
      // If AI assessment fails, still return the client
      logger.error('AI risk assessment failed, client created without assessment', aiError);
      
      res.status(201).json({
        success: true,
        data: client,
        message: 'Client created, but risk assessment failed. Please generate manually.',
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Update client
 */
export async function updateClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Check client exists and belongs to user
    const existingClient = await prisma.client.findFirst({
      where: { id, userId },
    });

    if (!existingClient) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const {
      companyName,
      businessDescription,
      registeredAddress,
      sourceOfFunds,
      sourceOfWealth,
      expectedTransactions,
      identityVerified,
      addressVerified,
      pepScreened,
      sanctionsScreened,
      nextReviewDate,
      monitoringNotes,
    } = req.body;

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        companyName,
        businessDescription,
        registeredAddress,
        sourceOfFunds,
        sourceOfWealth,
        expectedTransactions,
        identityVerified,
        addressVerified,
        pepScreened,
        sanctionsScreened,
        nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : undefined,
        monitoringNotes,
        updatedBy: userId,
      },
      include: {
        riskAssessment: true,
      },
    });

    logger.info('Client updated', { clientId: id, userId });

    res.json({
      success: true,
      data: updatedClient,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete client
 */
export async function deleteClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Check client exists and belongs to user
    const existingClient = await prisma.client.findFirst({
      where: { id, userId },
    });

    if (!existingClient) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // Delete related documents first
    await prisma.document.deleteMany({
      where: { clientId: id },
    });

    // Delete risk assessment
    if (existingClient.riskAssessmentId) {
      await prisma.riskAssessment.delete({
        where: { id: existingClient.riskAssessmentId },
      });
    }

    // Delete client
    await prisma.client.delete({
      where: { id },
    });

    logger.info('Client deleted', { clientId: id, userId });

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get client statistics
 */
export async function getClientStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const [
      totalClients,
      lowRiskCount,
      mediumRiskCount,
      highRiskCount,
      recentClients,
    ] = await Promise.all([
      prisma.client.count({ where: { userId } }),
      prisma.client.count({ where: { userId, riskLevel: 'LOW' } }),
      prisma.client.count({ where: { userId, riskLevel: 'MEDIUM' } }),
      prisma.client.count({ where: { userId, riskLevel: 'HIGH' } }),
      prisma.client.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        riskDistribution: {
          low: lowRiskCount,
          medium: mediumRiskCount,
          high: highRiskCount,
        },
        recentClients,
        complianceRate: totalClients > 0
          ? Math.round(((lowRiskCount + mediumRiskCount) / totalClients) * 100)
          : 100,
      },
    });
  } catch (error) {
    next(error);
  }
}
