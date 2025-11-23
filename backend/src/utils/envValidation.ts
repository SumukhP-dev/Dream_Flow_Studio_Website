import { logger } from './logger';
import { createError } from '../middleware/errorHandler';

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    description: string;
    validate?: (value: string) => boolean;
  };
}

const requiredEnvVars: RequiredEnvVars = {
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL database connection string',
    validate: (value) => value.startsWith('postgresql://'),
  },
  JWT_SECRET: {
    required: true,
    description: 'Secret key for JWT token signing',
    validate: (value) => value.length >= 32,
  },
  JWT_REFRESH_SECRET: {
    required: false,
    description: 'Secret key for JWT refresh token (defaults to JWT_SECRET + _refresh)',
  },
  FRONTEND_URL: {
    required: false,
    description: 'Frontend URL for email links',
  },
  OPENAI_API_KEY: {
    required: true,
    description: 'OpenAI API key for story generation',
    validate: (value) => value.startsWith('sk-'),
  },
  PORT: {
    required: false,
    description: 'Server port number',
    validate: (value) => {
      const port = parseInt(value, 10);
      return port > 0 && port < 65536;
    },
  },
  NODE_ENV: {
    required: false,
    description: 'Node environment (development, production, test)',
    validate: (value) => ['development', 'production', 'test'].includes(value),
  },
  // Optional but recommended
  CORS_ORIGIN: {
    required: false,
    description: 'Allowed CORS origins (comma-separated)',
  },
  // Email service (optional for password reset)
  SMTP_HOST: {
    required: false,
    description: 'SMTP server host for email sending',
  },
  SMTP_PORT: {
    required: false,
    description: 'SMTP server port',
  },
  SMTP_USER: {
    required: false,
    description: 'SMTP username',
  },
  SMTP_PASS: {
    required: false,
    description: 'SMTP password',
  },
  SMTP_FROM: {
    required: false,
    description: 'Email sender address',
  },
  // Error monitoring (optional)
  SENTRY_DSN: {
    required: false,
    description: 'Sentry DSN for error monitoring',
  },
};

export function validateEnvironment(): void {
  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];

    if (config.required && !value) {
      missing.push(`${key} (${config.description})`);
    } else if (value && config.validate && !config.validate(value)) {
      invalid.push(`${key} (${config.description})`);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.join('\n')}`;
    logger.error(errorMessage);
    throw createError(errorMessage, 500);
  }

  if (invalid.length > 0) {
    const warningMessage = `Invalid environment variables:\n${invalid.join('\n')}`;
    logger.warn(warningMessage);
    // Check if any invalid variable is required
    const hasInvalidRequired = Object.entries(requiredEnvVars).some(([key, config]) => {
      const value = process.env[key];
      return config.required && value && config.validate && !config.validate(value);
    });
    if (hasInvalidRequired) {
      throw createError(warningMessage, 500);
    }
  }

  logger.info('Environment variables validated successfully');
}

export function getCorsOrigins(): string[] {
  const corsOrigin = process.env.CORS_ORIGIN;
  
  if (!corsOrigin) {
    // Default to localhost in development, empty in production (must be set)
    if (process.env.NODE_ENV === 'development') {
      return ['http://localhost:3000', 'http://localhost:19006', 'http://localhost:8081'];
    }
    return [];
  }

  return corsOrigin.split(',').map(origin => origin.trim());
}

