import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { createError } from '../../middleware/errorHandler';

// Mock the error handler
jest.mock('../../middleware/errorHandler', () => ({
  createError: jest.fn((message: string, statusCode: number) => {
    const error: any = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  }),
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should authenticate valid token', () => {
    const userId = 'test-user-id';
    const email = 'test@example.com';
    const token = jwt.sign({ userId, email }, 'test-secret-key', {
      expiresIn: '7d',
    });

    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(mockRequest.userId).toBe(userId);
    expect(mockRequest.user?.id).toBe(userId);
    expect(mockRequest.user?.email).toBe(email);
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should reject request without token', () => {
    mockRequest.headers = {};

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No token provided',
        statusCode: 401,
      })
    );
  });

  it('should reject request with invalid token format', () => {
    mockRequest.headers = {
      authorization: 'InvalidFormat token',
    };

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'No token provided',
        statusCode: 401,
      })
    );
  });

  it('should reject request with invalid token', () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Invalid token',
        statusCode: 401,
      })
    );
  });

  it('should reject request when JWT_SECRET is not configured', () => {
    delete process.env.JWT_SECRET;

    const token = jwt.sign(
      { userId: 'test', email: 'test@example.com' },
      'some-secret'
    );
    mockRequest.headers = {
      authorization: `Bearer ${token}`,
    };

    authenticate(
      mockRequest as AuthRequest,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'JWT secret not configured',
        statusCode: 500,
      })
    );
  });
});

