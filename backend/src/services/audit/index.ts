import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export type AuditAction = 
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VIEW'
  | 'GENERATE'
  | 'EXPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'APPROVE'
  | 'REJECT'
  | 'UPLOAD'
  | 'DOWNLOAD';

interface AuditLogInput {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValues: input.oldValues,
        newValues: input.newValues,
        description: input.description,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', error);
    // Don't throw - audit logging should not break main functionality
  }
}

/**
 * Log client creation
 */
export async function logClientCreated(
  userId: string,
  clientId: string,
  clientName: string,
  req?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'CREATE',
    entityType: 'Client',
    entityId: clientId,
    newValues: { companyName: clientName },
    description: `Created new client: ${clientName}`,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}

/**
 * Log document upload
 */
export async function logDocumentUploaded(
  userId: string,
  documentId: string,
  documentName: string,
  clientId: string,
  req?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'UPLOAD',
    entityType: 'Document',
    entityId: documentId,
    newValues: { name: documentName, clientId },
    description: `Uploaded document: ${documentName}`,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}

/**
 * Log document verification
 */
export async function logDocumentVerified(
  userId: string,
  documentId: string,
  status: string,
  req?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action: status === 'VERIFIED' ? 'APPROVE' : 'REJECT',
    entityType: 'Document',
    entityId: documentId,
    newValues: { status },
    description: `Document ${status.toLowerCase().replace('_', ' ')}`,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}

/**
 * Log risk assessment override
 */
export async function logRiskAssessmentOverridden(
  userId: string,
  assessmentId: string,
  oldLevel: string,
  newLevel: string,
  reason: string,
  req?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'UPDATE',
    entityType: 'RiskAssessment',
    entityId: assessmentId,
    oldValues: { riskLevel: oldLevel },
    newValues: { riskLevel: newLevel, overrideReason: reason },
    description: `Risk assessment overridden: ${oldLevel} → ${newLevel}. Reason: ${reason}`,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}

/**
 * Log client view
 */
export async function logClientViewed(
  userId: string,
  clientId: string,
  clientName: string,
  req?: any
): Promise<void> {
  await logAuditEvent({
    userId,
    action: 'VIEW',
    entityType: 'Client',
    entityId: clientId,
    description: `Viewed client: ${clientName}`,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent'],
  });
}
