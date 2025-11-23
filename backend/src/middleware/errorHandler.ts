import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logger";
import { captureException } from "../utils/sentry";

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Log error with context
  logError(message, err, {
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).userId,
    isOperational: err.isOperational,
  });

  // Send to Sentry for non-operational errors (real bugs)
  if (!err.isOperational && statusCode >= 500) {
    captureException(err, {
      request: {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: (req as any).userId,
      },
    });
  }

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  // Provide user-friendly error messages for common scenarios
  let userMessage = message;
  if (statusCode === 429) {
    if (message.includes('limit')) {
      userMessage = message; // Keep limit messages as-is
    } else {
      userMessage = "Too many requests. Please try again later.";
    }
  } else if (statusCode === 400) {
    // Validation errors - keep original message
    userMessage = message;
  } else if (statusCode === 401) {
    userMessage = "Authentication required. Please log in.";
  } else if (statusCode === 403) {
    userMessage = "You don't have permission to perform this action.";
  } else if (statusCode === 404) {
    userMessage = message || "Resource not found.";
  } else if (statusCode >= 500) {
    userMessage = isDevelopment ? message : "An unexpected error occurred. Please try again later.";
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: userMessage,
      code: statusCode,
      ...(isDevelopment && { 
        stack: err.stack,
        originalMessage: message,
      }),
    },
  });
};

export const createError = (message: string, statusCode: number = 500) => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

