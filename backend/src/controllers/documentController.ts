import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../config/database';
import { pdfGenerationService } from '../services/pdf';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { config } from '../config';
import { logDocumentUploaded, logDocumentVerified } from '../services/audit';
import * as documentProcessor from '../services/documentProcessor';

/**
 * Get all documents for current user
 */
export async function getDocuments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { clientId, type } = req.query;

    const where: any = { userId };

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (type) {
      where.type = type;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        client: {
          select: {
            companyName: true,
            companyNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: documents,
      meta: {
        count: documents.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate and create new document
 */
export async function generateDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { clientId, type, name } = req.body;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get client with risk assessment
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: { riskAssessment: true },
    });

    if (!client) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    if (!client.riskAssessment) {
      throw createError('Risk assessment required before generating documents', 400, 'MISSING_RISK_ASSESSMENT');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeCompanyName = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${type}_${safeCompanyName}_${timestamp}.pdf`;
    const outputPath = path.join(config.uploadDir, userId, clientId, filename);

    // Generate PDF
    const filePath = await pdfGenerationService.generateDocument(
      type,
      client as any,
      client.riskAssessment as any,
      user as any,
      outputPath
    );

    // Get file stats
    const stats = await fs.stat(filePath);

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: name || `${type} - ${client.companyName}`,
        type,
        fileName: filename,
        filePath: filePath,
        fileSize: stats.size,
        mimeType: 'application/pdf',
        clientId,
        userId,
        status: 'DRAFT',
      },
    });

    logger.info('Document generated', {
      documentId: document.id,
      clientId,
      type,
      userId,
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document generated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate complete AML package
 */
export async function generateAMLPackage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { clientId } = req.body;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get client with risk assessment
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
      include: { riskAssessment: true },
    });

    if (!client) {
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    if (!client.riskAssessment) {
      throw createError('Risk assessment required', 400, 'MISSING_RISK_ASSESSMENT');
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeCompanyName = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `AML_Package_${safeCompanyName}_${timestamp}.pdf`;
    const outputPath = path.join(config.uploadDir, userId, clientId, filename);

    // Generate complete AML package PDF
    const filePath = await pdfGenerationService.generateAMLDocumentPackage(
      client as any,
      client.riskAssessment as any,
      user as any,
      outputPath
    );

    // Get file stats
    const stats = await fs.stat(filePath);

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: `Complete AML Package - ${client.companyName}`,
        type: 'RISK_ASSESSMENT',
        description: 'Complete AML compliance documentation including risk assessment, CDD, and ongoing monitoring plan',
        fileName: filename,
        filePath: filePath,
        fileSize: stats.size,
        mimeType: 'application/pdf',
        clientId,
        userId,
        status: 'DRAFT',
      },
    });

    logger.info('AML package generated', {
      documentId: document.id,
      clientId,
      userId,
    });

    res.status(201).json({
      success: true,
      data: document,
      message: 'Complete AML package generated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download document
 */
export async function downloadDocument(
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

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Check file exists
    try {
      await fs.access(document.filePath);
    } catch {
      throw createError('File not found on server', 404, 'FILE_NOT_FOUND');
    }

    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);

    // Send file
    res.sendFile(path.resolve(document.filePath), (err) => {
      if (err) {
        logger.error('Error sending file', err);
        next(createError('Error downloading file', 500, 'DOWNLOAD_ERROR'));
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete document
 */
export async function deleteDocument(
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

    const document = await prisma.document.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Delete file
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      logger.warn('Failed to delete file, continuing with DB record', error);
    }

    // Delete record
    await prisma.document.delete({
      where: { id },
    });

    logger.info('Document deleted', { documentId: id, userId });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Upload a document file
 */
export async function uploadDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    if (!req.file) {
      throw createError('No file uploaded', 400, 'NO_FILE');
    }

    const { clientId, type, name, description } = req.body;

    if (!clientId || !type) {
      // Delete uploaded file if validation fails
      await fs.unlink(req.file.path).catch(() => {});
      throw createError('Client ID and document type are required', 400, 'MISSING_FIELDS');
    }

    // Verify client belongs to user
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId },
    });

    if (!client) {
      await fs.unlink(req.file.path).catch(() => {});
      throw createError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: name || req.file.originalname,
        type,
        description,
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        clientId,
        userId,
        status: 'PENDING_VERIFICATION',
      },
    });

    logger.info('Document uploaded', {
      documentId: document.id,
      clientId,
      type,
      userId,
      fileName: req.file.filename,
    });

    // Audit log
    await logDocumentUploaded(userId, document.id, document.name, clientId, req);

    res.status(201).json({
      success: true,
      data: document,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify or update document status
 */
export async function verifyDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status, notes, expiryDate } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const document = await prisma.document.findFirst({
      where: { id, userId },
      include: { client: true },
    });

    if (!document) {
      throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Update document
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        status,
        description: notes ? `${document.description || ''}\n\nVerification Notes (${new Date().toISOString().split('T')[0]}): ${notes}`.trim() : document.description,
      },
    });

    // If ID verification document is verified, update client
    if (status === 'VERIFIED' && document.type === 'ID_VERIFICATION') {
      await prisma.client.update({
        where: { id: document.clientId },
        data: { identityVerified: true },
      });
    }

    // If address verification document is verified, update client
    if (status === 'VERIFIED' && document.type === 'ADDRESS_VERIFICATION') {
      await prisma.client.update({
        where: { id: document.clientId },
        data: { addressVerified: true },
      });
    }

    logger.info('Document verified', {
      documentId: id,
      status,
      userId,
    });

    // Audit log
    await logDocumentVerified(userId, id, status, req);

    res.json({
      success: true,
      data: updatedDocument,
      message: `Document ${status.toLowerCase().replace('_', ' ')}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Process document with OCR
 */
export async function processDocumentWithOCR(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { documentType } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const document = await prisma.document.findFirst({
      where: { id, userId },
      include: { client: true },
    });

    if (!document) {
      throw createError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Check if file is an image
    const isImage = ['image/jpeg', 'image/png', 'image/jpg'].includes(document.mimeType);
    if (!isImage) {
      throw createError('Document must be an image for OCR processing', 400, 'INVALID_FILE_TYPE');
    }

    // Verify document authenticity
    const authenticityCheck = await documentProcessor.verifyDocumentAuthenticity(document.filePath);

    // Process document with OCR
    const extractedData = await documentProcessor.processDocument(
      document.filePath,
      documentType || 'passport'
    );

    // Update document with extracted data
    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        templateData: {
          ocrData: JSON.parse(JSON.stringify(extractedData)),
          authenticityCheck: JSON.parse(JSON.stringify(authenticityCheck)),
          processedAt: new Date().toISOString(),
        } as any,
        description: `OCR Processed: ${extractedData.fullName || 'Name not detected'}`,
      },
    });

    // Auto-update client if data extracted successfully
    if (extractedData.confidence > 70 && document.client) {
      const updateData: any = {};
      
      if (extractedData.fullName && document.type === 'ID_VERIFICATION') {
        // Could store this in a directors/officers field
      }
      
      if (extractedData.address && document.type === 'ADDRESS_VERIFICATION') {
        updateData.registeredAddress = extractedData.address;
      }

      if (extractedData.companyName && document.type === 'RISK_ASSESSMENT') {
        // Verify company name matches
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.client.update({
          where: { id: document.clientId },
          data: updateData,
        });
      }
    }

    res.json({
      success: true,
      data: {
        document: updatedDocument,
        extractedData,
        authenticityCheck,
      },
      message: 'Document processed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get document statistics
 */
export async function getDocumentStats(
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
      totalDocuments,
      recentDocuments,
    ] = await Promise.all([
      prisma.document.count({ where: { userId } }),
      prisma.document.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    // Get documents by type
    const documentsByType = await prisma.document.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true },
    });

    res.json({
      success: true,
      data: {
        totalDocuments,
        recentDocuments,
        documentsByType: documentsByType.map(d => ({
          type: d.type,
          count: d._count.type,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
}
