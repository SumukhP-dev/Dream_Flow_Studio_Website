import { Request, Response, NextFunction } from 'express';
import { errorHandler, createError, AppError } from '../../middleware/errorHandler';
import * as logger from '../../utils/logger';
import * as sentry from '../../utils/sentry';

// Mock logger and sentry
jest.mock('../../utils/logger');
jest.mock('../../utils/sentry');

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      path: '/api/v1/test',
      method: 'GET',
      ip: '127.0.0.1',
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle operational errors with status code', () => {
      const error = createError('Test error', 400);
      error.isOperational = true;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.logError).toHaveBeenCalledWith(
        'Test error',
        error,
        expect.objectContaining({
          statusCode: 400,
          path: '/api/v1/test',
          method: 'GET',
          isOperational: true,
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
        },
      });
      expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('should handle non-operational errors and send to Sentry', () => {
      const error = new Error('Internal server error') as AppError;
      error.statusCode = 500;
      error.isOperational = false;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.logError).toHaveBeenCalled();
      expect(sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          request: {
            path: '/api/v1/test',
            method: 'GET',
            ip: '127.0.0.1',
          },
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should not send operational errors to Sentry', () => {
      const error = createError('Validation error', 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('should not send 4xx errors to Sentry', () => {
      const error = new Error('Client error') as AppError;
      error.statusCode = 404;
      error.isOperational = false;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(sentry.captureException).not.toHaveBeenCalled();
    });

    it('should use default status code 500 when not provided', () => {
      // Set NODE_ENV to test before creating error
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      const error = new Error('Unknown error');
      // Error without statusCode will default to 500

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      // In test environment (not development), 500 errors use "Internal Server Error" to hide details
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal Server Error',
        },
      });
      
      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });

    it('should use default message when not provided', () => {
      const error = new Error() as AppError;
      error.statusCode = 500;
      // Error with empty message will use default
      error.message = '';

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal Server Error',
        },
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const error = createError('Test error', 500);
      error.stack = 'Error stack trace';

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          stack: 'Error stack trace',
        },
      });
    });

    it('should hide error details in production for 5xx errors', () => {
      process.env.NODE_ENV = 'production';
      const error = createError('Database connection failed', 500);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Internal Server Error',
        },
      });
    });

    it('should include userId in error context when available', () => {
      const error = createError('Test error', 400);
      (mockRequest as any).userId = 'user-123';

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(logger.logError).toHaveBeenCalledWith(
        'Test error',
        error,
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });
  });

  describe('createError', () => {
    it('should create an error with message and status code', () => {
      const error = createError('Test error', 404);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should default to status code 500', () => {
      const error = createError('Test error');

      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });
  });
});

