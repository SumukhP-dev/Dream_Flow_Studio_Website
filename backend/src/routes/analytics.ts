import { Router } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { prismaClient as prisma } from "../utils/prisma";
import { createError } from "../middleware/errorHandler";

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/analytics:
 *   get:
 *     summary: Get analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    // Get story statistics
    const totalStories = await prisma.story.count({
      where: { userId },
    });

    // Get stories grouped by theme
    const storiesByTheme = await prisma.story.groupBy({
      by: ['theme'],
      where: { userId },
      _count: { theme: true },
      orderBy: { _count: { theme: 'desc' } },
      take: 10,
    });

    const popularThemes = storiesByTheme.map((item) => ({
      theme: item.theme,
      count: item._count.theme,
    }));

    // Get stories created in the last 30 days grouped by date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStories = await prisma.story.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
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
      where: { userId },
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
        OR: [
          { videoUrl: { not: null } },
          { audioUrl: { not: null } },
        ],
      },
    });

    const analytics = {
      totalStories,
      totalViews: 0, // Can be implemented when view tracking is added
      averageStoryLength,
      storiesWithMedia,
      popularThemes,
      usageByDate,
      recentActivity: {
        last7Days: await prisma.story.count({
          where: {
            userId,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        last30Days: recentStories.length,
      },
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    next(error);
  }
});

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


