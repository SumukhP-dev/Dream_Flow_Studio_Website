import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prismaClient as prisma } from '../utils/prisma';
import { createError } from './errorHandler';
import { logger } from '../utils/logger';

// Default limits per month (can be configured per user tier)
const DEFAULT_LIMITS = {
  video: 10,
  audio: 20,
};

/**
 * Middleware to check if user has exceeded media generation limits
 */
export async function checkMediaLimits(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId!;
    const { type } = req.body; // 'video' or 'audio'

    if (!type || (type !== 'video' && type !== 'audio')) {
      return next();
    }

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Count media generations this month
    const count = await prisma.mediaGenerationCost.count({
      where: {
        userId,
        type,
        createdAt: {
          gte: monthStart,
        },
        status: {
          in: ['completed', 'processing', 'pending'],
        },
      },
    });

    // Get user's limit (default for now, can be extended with user tiers)
    const limit = DEFAULT_LIMITS[type];

    if (count >= limit) {
      logger.warn(`User ${userId} exceeded ${type} generation limit`, {
        userId,
        type,
        count,
        limit,
      });

      throw createError(
        `You have reached your monthly limit of ${limit} ${type} generations. Please try again next month.`,
        429
      );
    }

    // Log current usage
    logger.info(`Media limit check passed for user ${userId}`, {
      userId,
      type,
      count,
      limit,
      remaining: limit - count,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Get user's media generation usage for the current month
 */
export async function getMediaUsage(
  userId: string,
  type: 'video' | 'audio'
): Promise<{ count: number; limit: number; remaining: number }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = await prisma.mediaGenerationCost.count({
    where: {
      userId,
      type,
      createdAt: {
        gte: monthStart,
      },
      status: {
        in: ['completed', 'processing', 'pending'],
      },
    },
  });

  const limit = DEFAULT_LIMITS[type];

  return {
    count,
    limit,
    remaining: Math.max(0, limit - count),
  };
}

