import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prismaClient as prisma } from "../utils/prisma";
import { createError } from "../middleware/errorHandler";
import { query, validationResult } from "express-validator";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/analytics:
 *   get:
 *     summary: Get analytics data with date range filtering
 *     description: Returns comprehensive creator analytics including story statistics, media generation metrics, popular themes, usage trends, and export statistics. Supports date range filtering.
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (ISO 8601 format). Defaults to 30 days ago if not specified.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (ISO 8601 format). Defaults to today if not specified.
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     totalStories:
 *                       type: number
 *                     averageStoryLength:
 *                       type: number
 *                     storiesWithMedia:
 *                       type: number
 *                     popularThemes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           theme:
 *                             type: string
 *                           count:
 *                             type: number
 *                     usageByDate:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: number
 *                     mediaGeneration:
 *                       type: object
 *                       properties:
 *                         videoSuccessRate:
 *                           type: number
 *                         audioSuccessRate:
 *                           type: number
 *                         totalVideoAttempts:
 *                           type: number
 *                         successfulVideos:
 *                           type: number
 *                         totalAudioAttempts:
 *                           type: number
 *                         successfulAudios:
 *                           type: number
 *                     exportStats:
 *                       type: object
 *                       properties:
 *                         totalExports:
 *                           type: number
 *                         exportsByFormat:
 *                           type: object
 *                           properties:
 *                             pdf:
 *                               type: number
 *                             markdown:
 *                               type: number
 *                             json:
 *                               type: number
 *                     recentActivity:
 *                       type: object
 *                       properties:
 *                         last7Days:
 *                           type: number
 *                         last30Days:
 *                           type: number
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/",
  [
    query("startDate").optional().isISO8601().withMessage("startDate must be a valid ISO date"),
    query("endDate").optional().isISO8601().withMessage("endDate must be a valid ISO date"),
  ],
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.userId!;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      // Build date filter
      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.gte = startDate;
        if (endDate) dateFilter.createdAt.lte = endDate;
      }

      // Get story statistics
      const totalStories = await prisma.story.count({
        where: { userId, ...dateFilter },
      });

      // Get stories grouped by theme
      const storiesByTheme = await prisma.story.groupBy({
        by: ['theme'],
        where: { userId, ...dateFilter },
        _count: { theme: true },
        orderBy: { _count: { theme: 'desc' } },
        take: 10,
      });

    const popularThemes = storiesByTheme.map((item) => ({
      theme: item.theme,
      count: item._count.theme,
    }));

      // Get stories for date range (default to last 30 days if not specified)
      const defaultStartDate = startDate || (() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
      })();

      const recentStories = await prisma.story.findMany({
        where: {
          userId,
          createdAt: {
            gte: defaultStartDate,
            ...(endDate && { lte: endDate }),
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

    // Group by date
    const usageByDate: { date: string; count: number }[] = [];
    const dateMap = new Map<string, number>();

    recentStories.forEach((story) => {
      const date = story.createdAt.toISOString().split('T')[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    dateMap.forEach((count, date) => {
      usageByDate.push({ date, count });
    });

    usageByDate.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate average story length (approximate)
      const allStories = await prisma.story.findMany({
        where: { userId, ...dateFilter },
        select: { content: true },
      });

      const totalWords = allStories.reduce((sum, story) => {
        return sum + story.content.split(/\s+/).length;
      }, 0);

      const averageStoryLength = totalStories > 0 ? Math.round(totalWords / totalStories) : 0;

      // Get stories with media (video or audio)
      const storiesWithMedia = await prisma.story.count({
        where: {
          userId,
          ...dateFilter,
          OR: [
            { videoUrl: { not: null, notIn: ['pending', 'processing', 'failed'] } },
            { audioUrl: { not: null, notIn: ['pending', 'processing', 'failed'] } },
          ],
        },
      });

      // Calculate media generation success rate
      const totalVideoAttempts = await prisma.story.count({
        where: {
          userId,
          ...dateFilter,
          videoUrl: { not: null },
        },
      });

      const successfulVideos = await prisma.story.count({
        where: {
          userId,
          ...dateFilter,
          videoUrl: { not: null, notIn: ['pending', 'processing', 'failed'] },
        },
      });

      const totalAudioAttempts = await prisma.story.count({
        where: {
          userId,
          ...dateFilter,
          audioUrl: { not: null },
        },
      });

      const successfulAudios = await prisma.story.count({
        where: {
          userId,
          ...dateFilter,
          audioUrl: { not: null, notIn: ['pending', 'processing', 'failed'] },
        },
      });

      const videoSuccessRate = totalVideoAttempts > 0
        ? Math.round((successfulVideos / totalVideoAttempts) * 100)
        : 0;

      const audioSuccessRate = totalAudioAttempts > 0
        ? Math.round((successfulAudios / totalAudioAttempts) * 100)
        : 0;

      // Calculate average generation time (placeholder - would need to track this)
      // For now, we'll estimate based on story length
      const averageGenerationTime = averageStoryLength > 0
        ? Math.round(averageStoryLength / 50) // Rough estimate: 50 words per second
        : 0;

      // Get export statistics (placeholder - would need to track exports)
      const exportStats = {
        totalExports: 0, // Can be implemented when export tracking is added
        exportsByFormat: {
          pdf: 0,
          markdown: 0,
          json: 0,
        },
      };

      // Get cost statistics from MediaGenerationCost
      const costFilter: any = { userId };
      if (startDate || endDate) {
        costFilter.createdAt = {};
        if (startDate) costFilter.createdAt.gte = startDate;
        if (endDate) costFilter.createdAt.lte = endDate;
      }

      const costRecords = await prisma.mediaGenerationCost.findMany({
        where: costFilter,
        select: {
          type: true,
          cost: true,
          provider: true,
          status: true,
        },
      });

      const totalCost = costRecords.reduce((sum, record) => sum + record.cost, 0);
      const videoCosts = costRecords.filter(r => r.type === 'video');
      const audioCosts = costRecords.filter(r => r.type === 'audio');
      const totalVideoCost = videoCosts.reduce((sum, r) => sum + r.cost, 0);
      const totalAudioCost = audioCosts.reduce((sum, r) => sum + r.cost, 0);
      const averageVideoCost = videoCosts.length > 0 ? totalVideoCost / videoCosts.length : 0;
      const averageAudioCost = audioCosts.length > 0 ? totalAudioCost / audioCosts.length : 0;

      // Cost by provider
      const costByProvider = costRecords.reduce((acc, record) => {
        if (!acc[record.provider]) {
          acc[record.provider] = 0;
        }
        acc[record.provider] += record.cost;
        return acc;
      }, {} as Record<string, number>);

      const analytics = {
        totalStories,
        totalViews: 0, // Can be implemented when view tracking is added
        averageStoryLength,
        storiesWithMedia,
        popularThemes,
        usageByDate,
        mediaGeneration: {
          videoSuccessRate,
          audioSuccessRate,
          totalVideoAttempts,
          successfulVideos,
          totalAudioAttempts,
          successfulAudios,
        },
        averageGenerationTime,
        exportStats,
        recentActivity: {
          last7Days: await prisma.story.count({
            where: {
              userId,
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          }),
          last30Days: recentStories.length,
        },
        dateRange: {
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
        costStats: {
          totalCost,
          totalVideoCost,
          totalAudioCost,
          averageVideoCost: Math.round(averageVideoCost * 100) / 100,
          averageAudioCost: Math.round(averageAudioCost * 100) / 100,
          costByProvider,
          totalGenerations: costRecords.length,
        },
      };

      res.json({
        success: true,
        analytics,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/analytics/story/:id:
 *   get:
 *     summary: Get story analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get("/story/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Verify story belongs to user
    const story = await prisma.story.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        theme: true,
        videoUrl: true,
        audioUrl: true,
        content: true,
      },
    });

    if (!story) {
      throw createError("Story not found", 404);
    }

    // Calculate story metrics
    const wordCount = story.content.split(/\s+/).length;
    const readingTimeMinutes = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min

    // Check if story has media
    const hasVideo = !!story.videoUrl;
    const hasAudio = !!story.audioUrl;

    // Get story age
    const storyAge = Math.floor(
      (Date.now() - story.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const analytics = {
      storyId: story.id,
      title: story.title,
      theme: story.theme,
      wordCount,
      readingTimeMinutes,
      hasVideo,
      hasAudio,
      createdAt: story.createdAt,
      updatedAt: story.updatedAt,
      storyAgeDays: storyAge,
      views: 0, // Can be implemented when view tracking is added
      completions: 0, // Can be implemented when completion tracking is added
      averageWatchTime: 0, // Can be implemented when playback tracking is added
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRoutes };


