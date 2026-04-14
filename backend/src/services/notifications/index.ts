import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import * as emailService from '../email';

/**
 * Check for upcoming document expiries and send reminders
 */
export async function checkDocumentExpiries(): Promise<void> {
  try {
    const now = new Date();
    const reminderDays = [30, 7, 1]; // Send reminders at 30, 7, and 1 days before expiry

    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);
      
      // Find documents expiring on this date (within 24h window)
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const expiringDocs = await prisma.document.findMany({
        where: {
          status: { in: ['VERIFIED', 'SIGNED'] },
          // In a real implementation, you'd have an expiryDate field
          // For now, we'll use createdAt + 1 year as default expiry
          createdAt: {
            gte: new Date(startOfDay.getTime() - 365 * 24 * 60 * 60 * 1000),
            lte: new Date(endOfDay.getTime() - 365 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          client: {
            select: {
              companyName: true,
              user: {
                select: {
                  email: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      for (const doc of expiringDocs) {
        if (doc.client?.user) {
          await emailService.sendDocumentExpiryReminder(
            doc.client.user.email,
            doc.client.user.firstName,
            doc.client.companyName,
            doc.name,
            days
          );
        }
      }
    }

    logger.info('Document expiry check completed');
  } catch (error) {
    logger.error('Failed to check document expiries', error);
  }
}

/**
 * Check for upcoming CDD reviews
 */
export async function checkCDDReviews(): Promise<void> {
  try {
    const now = new Date();
    const reminderDays = [30, 7, 1];

    for (const days of reminderDays) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + days);

      const clients = await prisma.client.findMany({
        where: {
          nextReviewDate: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lte: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
      });

      for (const client of clients) {
        if (client.user) {
          await emailService.sendCDDReviewReminder(
            client.user.email,
            client.user.firstName,
            client.companyName,
            client.nextReviewDate!.toLocaleDateString('en-GB')
          );
        }
      }
    }

    logger.info('CDD review check completed');
  } catch (error) {
    logger.error('Failed to check CDD reviews', error);
  }
}

/**
 * Start notification scheduler
 */
export function startNotificationScheduler(): void {
  // Run daily at 9 AM
  const runChecks = () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour === 9) {
      checkDocumentExpiries();
      checkCDDReviews();
    }
  };

  // Check every hour
  setInterval(runChecks, 60 * 60 * 1000);
  
  // Run immediately on startup - catch rejections to prevent crashing the server
  checkDocumentExpiries().catch((err) => logger.error('Document expiry check failed on startup', err));
  checkCDDReviews().catch((err) => logger.error('CDD review check failed on startup', err));

  logger.info('Notification scheduler started');
}
