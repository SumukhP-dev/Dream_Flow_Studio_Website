import { Router, Response, NextFunction } from "express";
import { body, validationResult, query } from "express-validator";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { storyGenerationLimiter } from "../middleware/rateLimiter";
import {
  validationChains,
  sanitizeString,
  sanitizeHTML,
} from "../utils/validation";
import { prismaClient as prisma } from "../utils/prisma";
import { generateStory } from "../services/storyService";
import { exportStory, ExportFormat } from "../services/exportService";
import { queueMediaGeneration, getMediaStatus, regenerateMedia } from "../services/mediaService";
import { checkMediaLimits, getMediaUsage } from "../middleware/mediaLimiter";
import { logger } from "../utils/logger";

const router = Router();

// All story routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/story:
 *   post:
 *     summary: Generate a new story
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/",
  storyGenerationLimiter,
  [
    validationChains.storyPrompt(),
    validationChains.storyTheme(),
    body("parameters").optional().isObject(),
    body("generateVideo").optional().isBoolean(),
    body("generateAudio").optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { prompt, theme, parameters, generateVideo, generateAudio } =
        req.body;
      const userId = req.userId!;

      // Check media generation limits if requested
      if (generateVideo) {
        req.body.type = 'video';
        await checkMediaLimits(req, res, (err) => {
          if (err) return next(err);
        });
      }
      if (generateAudio) {
        req.body.type = 'audio';
        await checkMediaLimits(req, res, (err) => {
          if (err) return next(err);
        });
      }

      // Sanitize inputs
      const sanitizedPrompt = sanitizeString(prompt);
      const sanitizedTheme = theme ? sanitizeString(theme) : "default";

      // Generate story using AI service
      const storyContent = await generateStory({
        prompt: sanitizedPrompt,
        theme: sanitizedTheme,
        parameters: parameters || {},
      });

      // Sanitize generated content
      const sanitizedTitle = sanitizeString(
        storyContent.title || "Untitled Story"
      );
      const sanitizedContent = sanitizeHTML(storyContent.content);

      // Save story to database
      const story = await prisma.story.create({
        data: {
          userId,
          title: sanitizedTitle,
          content: sanitizedContent,
          theme: sanitizedTheme,
          parameters: parameters || {},
          videoUrl: generateVideo ? "pending" : null,
          audioUrl: generateAudio ? "pending" : null,
        },
      });

      // Queue video/audio generation if requested
      if (generateVideo) {
        queueMediaGeneration(
          story.id,
          "video",
          sanitizedContent,
          sanitizedTitle,
          sanitizedTheme
        ).catch((error) => {
          logger.error("Failed to queue video generation", { error, storyId: story.id });
        });
      }

      if (generateAudio) {
        queueMediaGeneration(
          story.id,
          "audio",
          sanitizedContent,
          sanitizedTitle,
          sanitizedTheme
        ).catch((error) => {
          logger.error("Failed to queue audio generation", { error, storyId: story.id });
        });
      }

      res.status(201).json({
        success: true,
        story,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/story/history:
 *   get:
 *     summary: Get story history
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 */
/**
 * @swagger
 * /api/v1/story/history:
 *   get:
 *     summary: Get story history with pagination, filtering, and search
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: hasVideo
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: hasAudio
 *         schema:
 *           type: boolean
 */
router.get("/history", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    const theme = req.query.theme as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";
    const hasVideo = req.query.hasVideo === "true" ? true : req.query.hasVideo === "false" ? false : undefined;
    const hasAudio = req.query.hasAudio === "true" ? true : req.query.hasAudio === "false" ? false : undefined;

    // Build where clause
    const where: any = { userId };

    // Theme filter
    if (theme) {
      where.theme = theme;
    }

    // Search filter (title or content)
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Media filters
    if (hasVideo !== undefined) {
      if (hasVideo) {
        where.videoUrl = { not: null, notIn: ["pending", "processing", "failed"] };
      } else {
        // Combine with existing OR if search exists
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            {
              OR: [
                { videoUrl: null },
                { videoUrl: { in: ["pending", "processing", "failed"] } },
              ],
            },
          ];
          delete where.OR;
        } else {
          where.OR = [
            { videoUrl: null },
            { videoUrl: { in: ["pending", "processing", "failed"] } },
          ];
        }
      }
    }

    if (hasAudio !== undefined) {
      if (hasAudio) {
        where.audioUrl = { not: null, notIn: ["pending", "processing", "failed"] };
      } else {
        // Combine with existing OR/AND if they exist
        if (where.OR) {
          where.AND = [
            ...(where.AND || []),
            { OR: where.OR },
            {
              OR: [
                { audioUrl: null },
                { audioUrl: { in: ["pending", "processing", "failed"] } },
              ],
            },
          ];
          delete where.OR;
        } else if (where.AND) {
          where.AND.push({
            OR: [
              { audioUrl: null },
              { audioUrl: { in: ["pending", "processing", "failed"] } },
            ],
          });
        } else {
          where.OR = [
            { audioUrl: null },
            { audioUrl: { in: ["pending", "processing", "failed"] } },
          ];
        }
      }
    }

    // Validate sortBy
    const validSortFields = ["createdAt", "updatedAt", "title"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    // Get total count for pagination
    const total = await prisma.story.count({ where });

    // Get stories
    const stories = await prisma.story.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        content: true,
        theme: true,
        videoUrl: true,
        audioUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      stories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/story/:id:
 *   get:
 *     summary: Get a specific story
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const story = await prisma.story.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!story) {
      throw createError("Story not found", 404);
    }

    res.json({
      success: true,
      story,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/story/:id:
 *   put:
 *     summary: Update a story
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id",
  [
    validationChains.storyTitle(),
    validationChains.storyContent(),
    validationChains.storyTheme(),
    body("parameters").optional().isObject(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.userId!;
      const updates = req.body;

      // Sanitize updates
      if (updates.title) {
        updates.title = sanitizeString(updates.title);
      }
      if (updates.content) {
        updates.content = sanitizeHTML(updates.content);
      }
      if (updates.theme) {
        updates.theme = sanitizeString(updates.theme);
      }

      const story = await prisma.story.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!story) {
        throw createError("Story not found", 404);
      }

      const updatedStory = await prisma.story.update({
        where: { id },
        data: updates,
      });

      res.json({
        success: true,
        story: updatedStory,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/story/:id:
 *   delete:
 *     summary: Delete a story
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const story = await prisma.story.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!story) {
      throw createError("Story not found", 404);
    }

    await prisma.story.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Story deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/story/{id}/export:
 *   get:
 *     summary: Export a story in various formats
 *     description: Export a story as PDF, Markdown, or JSON. PDF returns binary data, Markdown and JSON return text.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [pdf, markdown, json]
 *         description: Export format
 *       - in: query
 *         name: includeMetadata
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include story metadata (creation date, theme, etc.)
 *       - in: query
 *         name: includeMediaLinks
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include video/audio URLs in export
 *     responses:
 *       200:
 *         description: Export file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           text/markdown:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Invalid format parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 */
router.get(
  "/:id/export",
  [
    query("format").isIn(["pdf", "markdown", "json"]).withMessage("Format must be pdf, markdown, or json"),
    query("includeMetadata").optional().isBoolean().withMessage("includeMetadata must be boolean"),
    query("includeMediaLinks").optional().isBoolean().withMessage("includeMediaLinks must be boolean"),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.userId!;
      const format = req.query.format as ExportFormat;
      const includeMetadata = req.query.includeMetadata === "true";
      const includeMediaLinks = req.query.includeMediaLinks === "true";

      // Find story and verify ownership
      const story = await prisma.story.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!story) {
        throw createError("Story not found", 404);
      }

      // Export the story
      const exported = await exportStory(story, format, {
        includeMetadata,
        includeMediaLinks,
      });

      // Set appropriate headers based on format
      const contentTypeMap: Record<ExportFormat, string> = {
        pdf: "application/pdf",
        markdown: "text/markdown",
        json: "application/json",
      };

      const extensionMap: Record<ExportFormat, string> = {
        pdf: "pdf",
        markdown: "md",
        json: "json",
      };

      const filename = `${story.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${extensionMap[format]}`;

      res.setHeader("Content-Type", contentTypeMap[format]);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      if (format === "pdf") {
        res.send(exported as Buffer);
      } else {
        res.send(exported as string);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/story/{id}/media/status:
 *   get:
 *     summary: Get media generation status for a story
 *     description: Returns the current status of video and audio generation (pending, processing, completed, or failed)
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Media status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: object
 *                   properties:
 *                     video:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *                     audio:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 */
router.get("/:id/media/status", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    // Verify story ownership
    const story = await prisma.story.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!story) {
      throw createError("Story not found", 404);
    }

    const status = await getMediaStatus(id);

    res.json({
      success: true,
      status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/story/media/usage:
 *   get:
 *     summary: Get user's media generation usage and limits
 *     description: Returns current usage count, limits, and remaining for video and audio generation
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usage information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 usage:
 *                   type: object
 *                   properties:
 *                     video:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         remaining:
 *                           type: number
 *                     audio:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         remaining:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
router.get("/media/usage", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const [videoUsage, audioUsage] = await Promise.all([
      getMediaUsage(userId, 'video'),
      getMediaUsage(userId, 'audio'),
    ]);

    res.json({
      success: true,
      usage: {
        video: videoUsage,
        audio: audioUsage,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/story/{id}/media/regenerate:
 *   post:
 *     summary: Regenerate media for a story
 *     description: Queue a new media generation job for video or audio. Uses the current story content.
 *     tags: [Story]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [video, audio]
 *                 description: Type of media to regenerate
 *     responses:
 *       200:
 *         description: Regeneration queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid type parameter
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Story not found
 */
router.post(
  "/:id/media/regenerate",
  [body("type").isIn(["video", "audio"]).withMessage("Type must be video or audio")],
  checkMediaLimits,
  async (req: AuthRequest, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const userId = req.userId!;
      const { type } = req.body;

      // Verify story ownership and get story data
      const story = await prisma.story.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!story) {
        throw createError("Story not found", 404);
      }

      // Queue regeneration
      await regenerateMedia(
        id,
        type,
        story.content,
        story.title,
        story.theme
      );

      res.json({
        success: true,
        message: `${type} regeneration queued`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as storyRoutes };
