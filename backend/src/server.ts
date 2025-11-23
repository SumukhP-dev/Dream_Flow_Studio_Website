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
  try {
    const { prismaClient } = await import("./utils/prisma");
    // Test database connection
    await prismaClient.$queryRaw`SELECT 1`;
    
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      database: "connected",
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(503).json({ 
      status: "error", 
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/story", storyRoutes);
app.use("/api/v1/assets", assetsRoutes);
app.use("/api/v1/analytics", analyticsRoutes);

// Error handling
app.use(errorHandler);

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT });
    logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  });
}

export default app;

