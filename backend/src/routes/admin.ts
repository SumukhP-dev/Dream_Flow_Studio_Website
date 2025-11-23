import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { mediaQueue } from '../services/mediaService';
import { logger } from '../utils/logger';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// TODO: Add admin role check middleware
// For now, any authenticated user can access (should be restricted in production)

/**
 * @swagger
 * /api/v1/admin/media-queue/status:
 *   get:
 *     summary: Get media queue status (Admin only)
 *     description: Returns queue length, active jobs, and failed jobs count
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 queue:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: number
 *                     active:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     failed:
 *                       type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/media-queue/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!mediaQueue) {
      return res.json({
        success: true,
        queue: {
          available: false,
          message: 'Media queue not available (Redis not connected)',
        },
      });
    }

    const [waiting, active, completed, failed] = await Promise.all([
      mediaQueue.getWaitingCount(),
      mediaQueue.getActiveCount(),
      mediaQueue.getCompletedCount(),
      mediaQueue.getFailedCount(),
    ]);

    res.json({
      success: true,
      queue: {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
      },
    });
  } catch (error) {
    logger.error('Failed to get media queue status', { error });
    next(error);
  }
});

export { router as adminRoutes };

