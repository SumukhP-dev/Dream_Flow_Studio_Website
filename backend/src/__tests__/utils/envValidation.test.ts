import { validateEnvironment, getCorsOrigins } from '../../utils/envValidation';
import { createError } from '../../middleware/errorHandler';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should pass with all required variables set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'sk-test-key';

      expect(() => validateEnvironment()).not.toThrow();
    });

    it('should throw error if DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'sk-test-key';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error if JWT_SECRET is missing', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      delete process.env.JWT_SECRET;
      process.env.OPENAI_API_KEY = 'sk-test-key';

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error if JWT_SECRET is too short', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'short'; // Less than 32 characters
      process.env.OPENAI_API_KEY = 'sk-test-key';

      // JWT_SECRET validation requires length >= 32, so this should throw
      expect(() => {
        const { validateEnvironment } = require('../../utils/envValidation');
        validateEnvironment();
      }).toThrow();
    });

    it('should throw error if OPENAI_API_KEY is missing', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      delete process.env.OPENAI_API_KEY;

      expect(() => validateEnvironment()).toThrow();
    });

    it('should throw error if OPENAI_API_KEY format is invalid', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'invalid-key'; // Doesn't start with 'sk-'

      // OPENAI_API_KEY validation requires it to start with 'sk-', so this should throw
      expect(() => {
        const { validateEnvironment } = require('../../utils/envValidation');
        validateEnvironment();
      }).toThrow();
    });

    it('should validate DATABASE_URL format', () => {
      process.env.DATABASE_URL = 'invalid-url'; // Doesn't start with 'postgresql://'
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'sk-test-key';

      // DATABASE_URL validation requires it to start with 'postgresql://', so this should throw
      expect(() => {
        const { validateEnvironment } = require('../../utils/envValidation');
        validateEnvironment();
      }).toThrow();
    });

    it('should allow optional variables to be missing', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.OPENAI_API_KEY = 'sk-test-key';
      delete process.env.SMTP_HOST;
      delete process.env.SENTRY_DSN;

      expect(() => validateEnvironment()).not.toThrow();
    });
  });

  describe('getCorsOrigins', () => {
    it('should return default origins in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.CORS_ORIGIN;

      const origins = getCorsOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:19006');
    });

    it('should return empty array in production if CORS_ORIGIN not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.CORS_ORIGIN;

      const origins = getCorsOrigins();
      expect(origins).toEqual([]);
    });

    it('should parse CORS_ORIGIN from environment', () => {
      process.env.CORS_ORIGIN = 'https://example.com,https://app.example.com';

      const origins = getCorsOrigins();
      expect(origins).toContain('https://example.com');
      expect(origins).toContain('https://app.example.com');
    });

    it('should trim whitespace from origins', () => {
      process.env.CORS_ORIGIN = ' https://example.com , https://app.example.com ';

      const origins = getCorsOrigins();
      expect(origins).toContain('https://example.com');
      expect(origins).toContain('https://app.example.com');
    });
  });
});

