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
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Treat clients with upcoming CDD review as "trials" for admin dashboard compatibility
    const [activeResult, expiringResult, expiredResult] = await Promise.all([
      prisma.client.count({
        where: {
          nextReviewDate: { gt: now },
        },
      }),
      prisma.client.count({
        where: {
          nextReviewDate: {
            gt: now,
            lte: sevenDays,
          },
        },
      }),
      prisma.client.count({
        where: {
          nextReviewDate: { lte: now },
        },
      }),
    ]);

    const activeClients = await prisma.client.findMany({
      where: { nextReviewDate: { gt: now } },
      orderBy: { nextReviewDate: 'asc' },
      take: 100,
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
      },
    });

    const active = activeClients.map((c) => ({
      id: c.id,
      name: c.companyName,
      owner_email: c.user?.email || '',
      owner_name: `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim(),
      max_users: 1,
      max_clients: 1,
      user_count: 1,
      client_count: 1,
      trial_ends_at: c.nextReviewDate,
      created_at: c.createdAt,
    }));

    res.json({
      activeTrials: activeResult,
      expiringSoon: expiringResult,
      expiredTrials: expiredResult,
      active,
      total: activeResult + expiredResult,
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
    const now = new Date();
    const months: { month: string; total_revenue: number; payment_count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ month: label, total_revenue: 0, payment_count: 0 });
    }

    // Count clients added per month as a proxy for "revenue activity"
    const clientCounts = await prisma.client.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
    });

    for (const c of clientCounts) {
      const label = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find((x) => x.month === label);
      if (m) {
        m.total_revenue = c._count.id * 150; // Proxy: £150 per client onboarding
        m.payment_count = c._count.id;
      }
    }

    const thisMonth = months[months.length - 1];

    res.json({
      monthlyRevenue: months,
      mrr: [{ total_mrr: thisMonth.total_revenue }],
      totalRevenue: [{ total: months.reduce((a, b) => a + b.total_revenue, 0) }],
      thisMonth: { revenue: thisMonth.total_revenue, count: thisMonth.payment_count },
      byTier: [],
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
      configured: !!(process.env.SMTP_HOST || process.env.EMAIL_HOST),
      provider: process.env.SMTP_HOST || process.env.EMAIL_HOST ? 'SMTP' : 'Not configured',
      sender: process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@guardianaml.capstonesoftware.co.uk',
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
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count document requests as email-like activity
    const pending = await prisma.documentRequest.count({
      where: { status: 'PENDING' },
    });

    const fulfilled24h = await prisma.documentRequest.count({
      where: {
        status: 'FULFILLED',
        completedAt: { gte: yesterday },
      },
    });

    const recent = await prisma.documentRequest.findMany({
      where: { status: 'FULFILLED' },
      orderBy: { completedAt: 'desc' },
      take: 20,
      include: {
        client: {
          select: {
            companyName: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    const recentMapped = recent.map((r) => ({
      id: r.id,
      template_type: r.type,
      recipient_email: r.client?.user?.email || r.client?.companyName || '',
      subject: r.title,
      status: 'sent',
      created_at: r.requestedAt,
      sent_at: r.completedAt,
    }));

    res.json({
      pending,
      sent24h: fulfilled24h,
      failed24h: 0,
      successRate: 100,
      recent: recentMapped,
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
