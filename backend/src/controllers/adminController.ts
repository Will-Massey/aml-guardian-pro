import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { JwtPayload } from '../types';
import * as emailService from '../services/email';

/**
 * Admin login - AccountFlow compatible format
 * POST /admin/auth/login
 */
export async function adminLogin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { username, password } = req.body;
    const email = username?.toLowerCase();

    if (!email || !password) {
      throw createError('Email and password required', 400, 'INVALID_CREDENTIALS');
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw createError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      throw createError('Super admin access required', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firmName: user.firmName,
      } as JwtPayload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );

    logger.info('Admin logged in', { userId: user.id, email: user.email });

    // Return AccountFlow-compatible format (unwrapped)
    res.json({
      token,
      user: {
        id: user.id,
        username: user.email,
        email: user.email,
        full_name: `${user.firstName} ${user.lastName}`,
        firstName: user.firstName,
        lastName: user.lastName,
        firmName: user.firmName,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get platform stats
 * GET /admin/stats
 */
export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [
      totalUsers,
      totalClients,
      totalDocuments,
      totalRiskAssessments,
      recentUsers,
      recentClients,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.document.count(),
      prisma.riskAssessment.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
      prisma.client.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      totalUsers,
      totalClients,
      totalDocuments,
      totalRiskAssessments,
      activeUsers: recentUsers,
      newClients: recentClients,
      platform: 'Guardian AML',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get trials data
 * GET /admin/trials
 */
export async function getTrials(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Guardian AML does not have a trial model; return empty compatible structure
    res.json({
      activeTrials: 0,
      expiringSoon: 0,
      expiredTrials: 0,
      active: [],
      total: 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get revenue summary
 * GET /admin/revenue/summary
 */
export async function getRevenueSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({
      mrr: [{ total_mrr: 0 }],
      thisMonth: { revenue: 0 },
      monthlyRevenue: [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get practices (mapped from users/firms)
 * GET /admin/practices?limit=500
 */
export async function getPractices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '500', 10), 1000);

    const users = await prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            clients: true,
            documents: true,
          },
        },
      },
    });

    const practices = users.map((user) => ({
      id: user.id,
      name: user.firmName || `${user.firstName} ${user.lastName}`,
      owner_email: user.email,
      primary_contact_email: user.email,
      user_count: 1,
      max_users: 1,
      client_count: user._count.clients,
      max_clients: -1,
      subscription_status: 'active',
      created_at: user.createdAt,
      updated_at: user.updatedAt,
      last_login_at: user.lastLoginAt,
      role: user.role,
      is_active: user.isActive,
    }));

    res.json(practices);
  } catch (error) {
    next(error);
  }
}

/**
 * Get email config
 * GET /admin/email-config
 */
export async function getEmailConfig(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({
      provider: process.env.SMTP_HOST ? 'smtp' : 'none',
      fromAddress: process.env.SMTP_USER || 'noreply@guardianaml.capstonesoftware.co.uk',
      smtpHost: process.env.SMTP_HOST || null,
      smtpPort: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get email stats
 * GET /admin/email-stats
 */
export async function getEmailStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({
      pending: 0,
      sent24h: 0,
      failed24h: 0,
      successRate: 100,
      recent: [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Send email
 * POST /admin/send-email
 */
export async function sendEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { to, subject, body, html } = req.body;

    if (!to || !subject || !(body || html)) {
      throw createError('To, subject, and body are required', 400, 'INVALID_REQUEST');
    }

    await emailService.sendEmail({
      to,
      subject,
      html: html || body,
      text: body,
    });

    res.json({ success: true, message: 'Email sent' });
  } catch (error) {
    next(error);
  }
}

/**
 * Convert practice to paid
 * POST /admin/practices/:id/convert-to-paid
 */
export async function convertToPaid(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    logger.info('Convert to paid requested (no-op for Guardian AML)', { userId: id });
    res.json({ success: true, message: 'Guardian AML does not use paid subscriptions' });
  } catch (error) {
    next(error);
  }
}

/**
 * Extend trial
 * POST /admin/trials/:id/extend
 */
export async function extendTrial(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { days } = req.body;
    logger.info('Extend trial requested (no-op for Guardian AML)', { userId: id, days });
    res.json({ success: true, message: 'Guardian AML does not use trials' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customers summary
 * GET /admin/customers/summary
 */
export async function getCustomersSummary(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [total, active, recent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    res.json({
      total,
      active,
      recent,
      churned: 0,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get revenue
 * GET /admin/revenue
 */
export async function getRevenue(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json({
      totalRevenue: 0,
      mrr: 0,
      arr: 0,
      monthlyRevenue: [],
      byPlatform: [],
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get activities
 * GET /admin/activities
 */
export async function getActivities(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);

    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            firmName: true,
          },
        },
      },
    });

    const activities = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      description: log.description,
      user: log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : 'System',
      firm: log.user?.firmName || null,
      createdAt: log.createdAt,
      ipAddress: log.ipAddress,
    }));

    res.json(activities);
  } catch (error) {
    next(error);
  }
}
