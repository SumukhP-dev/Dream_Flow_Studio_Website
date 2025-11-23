import { Router } from "express";
import multer from "multer";
import { authenticate, AuthRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import { uploadLimiter } from "../middleware/rateLimiter";
import { sanitizeString } from "../utils/validation";
import { getStorageService } from "../services/storageService";
import { prismaClient as prisma } from "../utils/prisma";
import { logInfo, logError } from "../utils/logger";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// All asset routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/assets/video/:id:
 *   get:
 *     summary: Get video URL
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 */
router.get("/video/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        userId,
        type: 'video',
      },
    });

    if (!asset) {
      throw createError("Video asset not found", 404);
    }

    const storageService = getStorageService();
    const url = await storageService.getFileUrl(asset.url, 3600); // 1 hour expiry

    res.json({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/assets/audio/:id:
 *   get:
 *     summary: Get audio URL
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 */
router.get("/audio/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        userId,
        type: 'audio',
      },
    });

    if (!asset) {
      throw createError("Audio asset not found", 404);
    }

    const storageService = getStorageService();
    const url = await storageService.getFileUrl(asset.url, 3600); // 1 hour expiry

    res.json({
      success: true,
      url,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/assets/upload:
 *   post:
 *     summary: Upload custom asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        throw createError("No file provided", 400);
      }

      const userId = req.userId!;
      const { type } = req.body; // 'video', 'audio', 'image'
      
      // Validate and sanitize type
      const validTypes = ['video', 'audio', 'image'];
      if (!type || !validTypes.includes(type)) {
        throw createError("Invalid asset type. Must be one of: video, audio, image", 400);
      }
      const sanitizedType = sanitizeString(type);

      // Validate file type and size
      const allowedMimeTypes = 
        type === 'video' 
          ? ['video/mp4', 'video/webm', 'video/quicktime']
          : type === 'audio'
          ? ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
          : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      const maxSize = type === 'video' ? 100 * 1024 * 1024 : type === 'audio' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

      if (!allowedMimeTypes.includes(req.file!.mimetype)) {
        throw createError(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
          400
        );
      }

      if (req.file!.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
        throw createError(
          `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
          400
        );
      }

      const storageService = getStorageService();
      const sanitizedName = sanitizeString(req.file!.originalname);

      // Upload file to storage
      const uploadResult = await storageService.uploadFile(
        req.file!.buffer,
        sanitizedName,
        req.file!.mimetype,
        userId
      );

      // Save asset metadata to database
      const asset = await prisma.asset.create({
        data: {
          userId,
          type: sanitizedType,
          url: uploadResult.key, // Store the key/path, not full URL
          thumbnailUrl: uploadResult.thumbnailUrl,
          name: sanitizedName,
          size: req.file!.size,
        },
      });

      logInfo('Asset uploaded successfully', {
        assetId: asset.id,
        type: sanitizedType,
        userId,
      });

      res.json({
        success: true,
        asset: {
          id: asset.id,
          type: asset.type,
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          name: asset.name,
          size: asset.size,
          createdAt: asset.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/assets:
 *   get:
 *     summary: Get all assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const userId = req.userId!;
    const { type, limit = 50, offset = 0 } = req.query;

    const where: any = { userId };
    if (type && ['video', 'audio', 'image'].includes(type as string)) {
      where.type = type;
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.asset.count({ where }),
    ]);

    // Get signed URLs for assets
    const storageService = getStorageService();
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const url = await storageService.getFileUrl(asset.url, 3600);
        return {
          ...asset,
          url,
        };
      })
    );

    res.json({
      success: true,
      assets: assetsWithUrls,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/assets/:id:
 *   delete:
 *     summary: Delete an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id", async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!asset) {
      throw createError("Asset not found", 404);
    }

    // Delete from storage
    const storageService = getStorageService();
    await storageService.deleteFile(asset.url);
    if (asset.thumbnailUrl) {
      await storageService.deleteFile(asset.thumbnailUrl);
    }

    // Delete from database
    await prisma.asset.delete({
      where: { id },
    });

    logInfo('Asset deleted successfully', { assetId: id, userId });

    res.json({
      success: true,
      message: "Asset deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

export { router as assetsRoutes };

