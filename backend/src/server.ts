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

dotenv.config();

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

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan("combined", { stream: morganStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all API routes
app.use("/api/v1", apiLimiter);

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

