import * as Sentry from '@sentry/node';
import { logger } from './logger';

let sentryInitialized = false;

export function initializeSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.info('Sentry DSN not provided - error monitoring disabled');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app: undefined }),
      ],
    });

    sentryInitialized = true;
    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

export function captureException(error: Error, context?: Record<string, any>): void {
  if (!sentryInitialized) {
    return;
  }

  try {
    if (context) {
      Sentry.withScope((scope: Sentry.Scope) => {
        Object.entries(context).forEach(([key, value]) => {
          scope.setContext(key, value);
        });
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  } catch (err) {
    logger.error('Failed to capture exception in Sentry', { err });
  }
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!sentryInitialized) {
    return;
  }

  try {
    Sentry.captureMessage(message, level);
  } catch (error) {
    logger.error('Failed to capture message in Sentry', { error });
  }
}

export { Sentry };

