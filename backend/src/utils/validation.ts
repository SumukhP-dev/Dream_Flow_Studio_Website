import { body, ValidationChain } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  // Remove script tags and their content completely
  let cleaned = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Remove all HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  // Decode HTML entities
  cleaned = cleaned.replace(/&[#\w]+;/g, '');
  // Then use DOMPurify as additional safety
  return DOMPurify.sanitize(cleaned, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitize HTML content (allows safe HTML tags)
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate file type
 */
export function validateFileType(
  mimetype: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimetype);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  return sanitized;
}

/**
 * Validation chains for common fields
 */
export const validationChains = {
  email: (): ValidationChain =>
    body('email')
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .isLength({ max: 255 })
      .withMessage('Email must be less than 255 characters'),

  password: (): ValidationChain =>
    body('password')
      .trim()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/)
      .withMessage('Password must contain at least one special character'),

  name: (): ValidationChain =>
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),

  storyPrompt: (): ValidationChain =>
    body('prompt')
      .trim()
      .notEmpty()
      .withMessage('Story prompt is required')
      .isLength({ min: 10, max: 1000 })
      .withMessage('Story prompt must be between 10 and 1000 characters'),

  storyTheme: (): ValidationChain =>
    body('theme')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Theme must be less than 50 characters')
      .matches(/^[a-zA-Z0-9\s-]+$/)
      .withMessage('Theme can only contain letters, numbers, spaces, and hyphens'),

  storyTitle: (): ValidationChain =>
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),

  storyContent: (): ValidationChain =>
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Content must be between 1 and 50000 characters'),
};

