import { Request, Response, NextFunction } from 'express';
import { validateFile, fileValidators } from '../../middleware/fileValidation';
import { createError } from '../../middleware/errorHandler';

// Mock error handler
jest.mock('../../middleware/errorHandler', () => ({
  createError: jest.fn((message: string, statusCode: number) => {
    const error: any = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
  }),
}));

describe('File Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should pass validation for valid file', () => {
      (mockRequest as any).file = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it('should reject when no file is provided', () => {
      (mockRequest as any).file = undefined;

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg'],
        maxSize: 10 * 1024 * 1024,
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No file provided',
          statusCode: 400,
        })
      );
    });

    it('should reject file with invalid MIME type', () => {
      (mockRequest as any).file = {
        mimetype: 'application/pdf',
        size: 1024 * 1024,
      };

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024,
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid file type'),
          statusCode: 400,
        })
      );
    });

    it('should reject file that exceeds max size', () => {
      (mockRequest as any).file = {
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
      };

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg'],
        maxSize: 10 * 1024 * 1024, // 10MB max
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('File size exceeds'),
          statusCode: 400,
        })
      );
    });

    it('should use custom field name in error message', () => {
      (mockRequest as any).file = undefined;

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg'],
        maxSize: 10 * 1024 * 1024,
        fieldName: 'avatar',
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No avatar provided',
          statusCode: 400,
        })
      );
    });

    it('should accept file at exactly max size', () => {
      (mockRequest as any).file = {
        mimetype: 'image/jpeg',
        size: 10 * 1024 * 1024, // Exactly 10MB
      };

      const middleware = validateFile({
        allowedMimeTypes: ['image/jpeg'],
        maxSize: 10 * 1024 * 1024,
      });

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });

  describe('fileValidators', () => {
    describe('image validator', () => {
      it('should accept valid image files', () => {
        (mockRequest as any).file = {
          mimetype: 'image/png',
          size: 5 * 1024 * 1024, // 5MB
        };

        fileValidators.image(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith();
      });

      it('should reject invalid image MIME type', () => {
        (mockRequest as any).file = {
          mimetype: 'video/mp4',
          size: 5 * 1024 * 1024,
        };

        fileValidators.image(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
          })
        );
      });

      it('should reject image exceeding 10MB', () => {
        (mockRequest as any).file = {
          mimetype: 'image/jpeg',
          size: 15 * 1024 * 1024, // 15MB
        };

        fileValidators.image(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
          })
        );
      });
    });

    describe('video validator', () => {
      it('should accept valid video files', () => {
        (mockRequest as any).file = {
          mimetype: 'video/mp4',
          size: 50 * 1024 * 1024, // 50MB
        };

        fileValidators.video(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith();
      });

      it('should reject video exceeding 100MB', () => {
        (mockRequest as any).file = {
          mimetype: 'video/mp4',
          size: 150 * 1024 * 1024, // 150MB
        };

        fileValidators.video(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
          })
        );
      });
    });

    describe('audio validator', () => {
      it('should accept valid audio files', () => {
        (mockRequest as any).file = {
          mimetype: 'audio/mpeg',
          size: 25 * 1024 * 1024, // 25MB
        };

        fileValidators.audio(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith();
      });

      it('should reject audio exceeding 50MB', () => {
        (mockRequest as any).file = {
          mimetype: 'audio/mpeg',
          size: 75 * 1024 * 1024, // 75MB
        };

        fileValidators.audio(
          mockRequest as Request,
          mockResponse as Response,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledWith(
          expect.objectContaining({
            statusCode: 400,
          })
        );
      });
    });
  });
});

