import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { config } from '../config';
import * as emailService from '../services/email';

/**
 * Get all team members for the firm
 */
export async function getTeamMembers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get current user's firm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firmName: true },
    });

    if (!currentUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get all users from the same firm
    const members = await prisma.user.findMany({
      where: { firmName: currentUser.firmName },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Invite a new team member
 */
export async function inviteTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { email, firstName, lastName, role } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get current user's firm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw createError('User already exists with this email', 409, 'USER_EXISTS');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(tempPassword, config.bcryptRounds);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        firmName: currentUser.firmName,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send invitation email
    await emailService.sendEmail({
      to: email,
      subject: `You've been invited to join ${currentUser.firmName} on AML Guardian Pro`,
      html: `
        <h2>Welcome to AML Guardian Pro</h2>
        <p>Hello ${firstName},</p>
        <p>You've been invited to join <strong>${currentUser.firmName}</strong> on AML Guardian Pro as a <strong>${role}</strong>.</p>
        <p>Your temporary password is: <code>${tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
        <p><a href="${config.frontendUrl}/login" style="padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Log In</a></p>
      `,
    });

    logger.info('Team member invited', {
      invitedBy: userId,
      newUserId: newUser.id,
      role,
    });

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Team member invited successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update team member
 */
export async function updateTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { role, isActive } = req.body;

    if (!userId) {
      throw createError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get current user's firm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firmName: true, role: true },
    });

    if (!currentUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get target user
    const targetUser = await prisma.user.findFirst({
      where: { id, firmName: currentUser.firmName },
    });

    if (!targetUser) {
      throw createError('Team member not found', 404, 'NOT_FOUND');
    }

    // Prevent changing own role (to avoid locking yourself out)
    if (id === userId) {
      throw createError('Cannot modify your own account', 400, 'SELF_MODIFY');
    }

    // Only ADMIN can create other ADMINs
    if (role === 'ADMIN' && currentUser.role !== 'ADMIN') {
      throw createError('Only administrators can assign admin role', 403, 'FORBIDDEN');
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    logger.info('Team member updated', {
      updatedBy: userId,
      targetUserId: id,
      changes: { role, isActive },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Team member updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remove team member
 */
export async function removeTeamMember(
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

    if (id === userId) {
      throw createError('Cannot delete your own account', 400, 'SELF_DELETE');
    }

    // Get current user's firm
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { firmName: true },
    });

    if (!currentUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify target user belongs to same firm
    const targetUser = await prisma.user.findFirst({
      where: { id, firmName: currentUser.firmName },
    });

    if (!targetUser) {
      throw createError('Team member not found', 404, 'NOT_FOUND');
    }

    // Soft delete by deactivating
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Team member removed', {
      removedBy: userId,
      targetUserId: id,
    });

    res.json({
      success: true,
      message: 'Team member removed successfully',
    });
  } catch (error) {
    next(error);
  }
}
