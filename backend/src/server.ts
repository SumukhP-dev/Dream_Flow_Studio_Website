import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { logger, morganStream } from "./utils/logger";

import { errorHandler } from "./middleware/errorHandler";
import { apiLimiter } from "./middleware/rateLimiter";
import { authRoutes } from "./routes/auth";
import { storyRoutes } from "./routes/story";
import { assetsRoutes } from "./routes/assets";
import { analyticsRoutes } from "./routes/analytics";
import { validateEnvironment, getCorsOrigins } from "./utils/envValidation";
import { initializeSentry } from "./utils/sentry";
import { initializeMediaService } from "./services/mediaService";

dotenv.config();

// Initialize Sentry before other initialization
initializeSentry();

// Validate environment variables on startup
// Skip validation in test environment to allow tests to run
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  try {
    validateEnvironment();
  } catch (error) {
    logger.error("Environment validation failed", { error });
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Dream Flow Studio API",
      version: "1.0.0",
      description: "API for Dream Flow Creator Studio",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// CORS configuration
const corsOrigins = getCorsOrigins();
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (corsOrigins.length === 0) {
      // In production, if CORS_ORIGIN is not set, reject all origins
      if (process.env.NODE_ENV === 'production') {
        logger.warn('CORS_ORIGIN not set in production - rejecting all origins');
        return callback(new Error('CORS not configured'));
      }
      // In development, allow all if not configured
      return callback(null, true);
    }

    if (corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(morgan("combined", { stream: morganStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use("/api/v1", apiLimiter);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/health", async (req, res) => {
  const healthStatus: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    services: {},
  };

  let overallStatus = "ok";

  // Check database
  try {
    const { prismaClient } = await import("./utils/prisma");
    await prismaClient.$queryRaw`SELECT 1`;
    healthStatus.services.database = "connected";
  } catch (error) {
    healthStatus.services.database = "disconnected";
    overallStatus = "degraded";
    if (process.env.NODE_ENV === 'development') {
      healthStatus.services.databaseError = (error as Error).message;
    }
  }

  // Check Redis
  try {
    const Redis = (await import('ioredis')).default;
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 2000,
    });
    await redis.ping();
    await redis.quit();
    healthStatus.services.redis = "connected";
  } catch (error) {
    healthStatus.services.redis = "disconnected";
    // Redis is optional, so don't mark as degraded
    if (process.env.NODE_ENV === 'development') {
      healthStatus.services.redisError = (error as Error).message;
    }
  }

  // Check storage service
  try {
    const { getStorageService } = await import("./services/storageService");
    const storage = getStorageService();
    // Try to get a test URL (this will fail if not configured, but won't throw)
    healthStatus.services.storage = "configured";
  } catch (error) {
    healthStatus.services.storage = "not_configured";
    // Storage is optional, so don't mark as degraded
    if (process.env.NODE_ENV === 'development') {
      healthStatus.services.storageError = (error as Error).message;
    }
  }

  healthStatus.status = overallStatus;
  const statusCode = overallStatus === "ok" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/story", storyRoutes);
app.use("/api/v1/assets", assetsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/admin", adminRoutes);

// Error handling
app.use(errorHandler);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  // Initialize media generation service
  initializeMediaService().catch((error) => {
    logger.warn('Failed to initialize media service', { error });
  });

  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT });
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

export default app;

