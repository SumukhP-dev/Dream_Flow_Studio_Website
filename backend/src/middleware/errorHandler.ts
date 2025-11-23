import { Request, Response, NextFunction } from "express";
import { logError } from "../utils/logger";

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

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(statusCode).json({
    success: false,
    error: {
      message: isDevelopment ? message : statusCode >= 500 ? "Internal Server Error" : message,
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

export const createError = (message: string, statusCode: number = 500) => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

