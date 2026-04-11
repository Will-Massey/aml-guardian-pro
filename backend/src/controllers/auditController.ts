import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { clientId, entityType, action, page = '1', limit = '50' } = req.query;

    const where: any = { userId };

    if (clientId) {
      where.entityId = clientId as string;
    }

    if (entityType) {
      where.entityType = entityType as string;
    }

    if (action) {
      where.action = action as string;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      meta: {
        page: parseInt(page as string),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get audit statistics
 */
export async function getAuditStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalActions,
      recentActions,
      actionsByType,
      recentLogs,
    ] = await Promise.all([
      prisma.auditLog.count({ where: { userId } }),
      prisma.auditLog.count({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { userId },
        _count: { action: true },
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalActions,
        recentActions,
        actionsByType: actionsByType.map(a => ({
          action: a.action,
          count: a._count.action,
        })),
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
}
