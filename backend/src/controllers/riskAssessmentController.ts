import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { aiRiskAssessmentService } from '../services/ai';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { RiskLevel, RiskFactor } from '../types';
import { logRiskAssessmentOverridden } from '../services/audit';

/**
 * Get risk assessment for a client
 */
export async function getRiskAssessment(
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

    // Get risk assessment with client info
    const riskAssessment = await prisma.riskAssessment.findFirst({
      where: {
        id,
        client: {
          userId,
        },
      },
      include: {
        client: true,
      },
    });

    if (!riskAssessment) {
      throw createError('Risk assessment not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerate risk assessment using AI
 */
export async function regenerateRiskAssessment(
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

    // Get client with existing risk assessment
    const client = await prisma.client.findFirst({
      where: {
        riskAssessmentId: id,
        userId,
      },
    });

    if (!client) {
      throw createError('Client or risk assessment not found', 404, 'NOT_FOUND');
    }

    // Generate new risk assessment
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

    // Update risk assessment
    const updatedAssessment = await prisma.riskAssessment.update({
      where: { id },
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
        aiGeneratedAt: new Date(),
        aiModel: riskAssessmentData.aiModel,
        manualOverride: false,
        manualRiskLevel: null,
        overrideReason: null,
        riskJustification: riskAssessmentData.riskJustification,
      },
    });

    // Update client risk level
    await prisma.client.update({
      where: { id: client.id },
      data: {
        riskLevel: riskAssessmentData.overallRiskLevel || 'MEDIUM',
      },
    });

    logger.info('Risk assessment regenerated', {
      clientId: client.id,
      riskLevel: riskAssessmentData.overallRiskLevel,
    });

    res.json({
      success: true,
      data: updatedAssessment,
      message: 'Risk assessment regenerated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Override risk assessment manually
 */
export async function overrideRiskAssessment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { manualRiskLevel, overrideReason } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!manualRiskLevel || !['LOW', 'MEDIUM', 'HIGH'].includes(manualRiskLevel)) {
      throw createError('Valid risk level required', 400, 'INVALID_RISK_LEVEL');
    }

    if (!overrideReason || overrideReason.length < 10) {
      throw createError('Override reason required (min 10 characters)', 400, 'INVALID_REASON');
    }

    // Get client
    const client = await prisma.client.findFirst({
      where: {
        riskAssessmentId: id,
        userId,
      },
    });

    if (!client) {
      throw createError('Risk assessment not found', 404, 'NOT_FOUND');
    }

    // Update risk assessment
    const updatedAssessment = await prisma.riskAssessment.update({
      where: { id },
      data: {
        manualOverride: true,
        manualRiskLevel,
        overrideReason,
        overriddenBy: userId,
        overriddenAt: new Date(),
        overallRiskLevel: manualRiskLevel as RiskLevel,
      },
    });

    // Update client risk level
    await prisma.client.update({
      where: { id: client.id },
      data: {
        riskLevel: manualRiskLevel as RiskLevel,
      },
    });

    logger.info('Risk assessment manually overridden', {
      clientId: client.id,
      manualRiskLevel,
      overriddenBy: userId,
    });

    // Audit log
    await logRiskAssessmentOverridden(
      userId,
      id,
      client.riskLevel,
      manualRiskLevel,
      overrideReason,
      req
    );

    res.json({
      success: true,
      data: updatedAssessment,
      message: 'Risk assessment overridden successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Preview risk assessment (without saving)
 */
export async function previewRiskAssessment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const {
      companyName,
      companyNumber,
      companyType,
      sicCodes,
      businessDescription,
      registeredAddress,
      officers,
      pscs,
      incorporationDate,
    } = req.body;

    if (!companyName) {
      throw createError('Company name is required', 400, 'MISSING_COMPANY_NAME');
    }

    // Generate preview assessment
    const riskAssessmentData = await aiRiskAssessmentService.assessRisk({
      companyName,
      companyNumber,
      companyType,
      sicCodes: sicCodes || [],
      businessDescription,
      registeredAddress,
      officers,
      pscs,
      incorporationDate: incorporationDate ? new Date(incorporationDate) : undefined,
    });

    res.json({
      success: true,
      data: riskAssessmentData,
    });
  } catch (error) {
    next(error);
  }
}
