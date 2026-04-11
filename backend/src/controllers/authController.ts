import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import { JwtPayload } from '../types';

/**
 * Register new user
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, firstName, lastName, firmName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw createError('User already exists with this email', 409, 'USER_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.bcryptRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        firmName,
        role: 'ACCOUNTANT',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmName: user.firmName,
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user,
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login user
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!user.isActive) {
      throw createError('Account is disabled', 403, 'ACCOUNT_DISABLED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      firmName: user.firmName,
    });

    logger.info('User logged in', { userId: user.id });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          firmName: user.firmName,
          role: user.role,
        },
        tokens,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        firmAddress: true,
        firmPhone: true,
        firmEmail: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { firstName, lastName, firmName, firmAddress, firmPhone, firmEmail } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        firmName,
        firmAddress,
        firmPhone,
        firmEmail,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firmName: true,
        role: true,
        firmAddress: true,
        firmPhone: true,
        firmEmail: true,
      },
    });

    logger.info('User profile updated', { userId });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change password
 */
export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw createError('Current password is incorrect', 400, 'INVALID_PASSWORD');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.bcryptRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info('Password changed', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate JWT tokens
 */
function generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string; expiresIn: number } {
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as any,
  });

  // For simplicity, using same token as refresh (in production, use different secrets)
  const refreshToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 86400, // 24 hours in seconds
  };
}
