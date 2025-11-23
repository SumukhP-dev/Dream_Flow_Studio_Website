import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { storyGenerationLimiter } from "../middleware/rateLimiter";
import {
  validationChains,
  sanitizeString,
  sanitizeHTML,
} from "../utils/validation";
import { PrismaClient } from "@prisma/client";
import { generateStory } from "../services/storyService";

const router = Router();
const prisma = new PrismaClient();

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

      // TODO: Queue video/audio generation if requested

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
router.get("/history", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;

    const stories = await prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
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

export { router as storyRoutes };
