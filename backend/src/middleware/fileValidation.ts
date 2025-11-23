import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';
import { validateFileType, validateFileSize } from '../utils/validation';

export interface FileValidationOptions {
  allowedMimeTypes: string[];
  maxSize: number; // in bytes
  fieldName?: string; // default: 'file'
}

/**
 * Middleware to validate uploaded files
 */
export function validateFile(options: FileValidationOptions) {
  const { allowedMimeTypes, maxSize, fieldName = 'file' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const file = (req as any).file;

    if (!file) {
      return next(createError(`No ${fieldName} provided`, 400));
    }

    // Validate file type
    if (!validateFileType(file.mimetype, allowedMimeTypes)) {
      return next(
        createError(
          `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
          400
        )
      );
    }

    // Validate file size
    if (!validateFileSize(file.size, maxSize)) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return next(
        createError(
          `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
          400
        )
      );
    }

    next();
  };
}

/**
 * Predefined file validators
 */
export const fileValidators = {
  image: validateFile({
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  }),

  video: validateFile({
    allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
    maxSize: 100 * 1024 * 1024, // 100MB
  }),

  audio: validateFile({
    allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
    maxSize: 50 * 1024 * 1024, // 50MB
  }),
};

