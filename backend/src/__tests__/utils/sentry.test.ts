import * as Sentry from '@sentry/node';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((callback) => {
    const scope = {
      setContext: jest.fn(),
    };
    callback(scope);
  }),
  Integrations: {
    Http: jest.fn(),
    Express: jest.fn(),
  },
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sentry Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initializeSentry', () => {
    it('should initialize Sentry when DSN is provided', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/test';
      process.env.NODE_ENV = 'production';

      jest.clearAllMocks();
      jest.resetModules();
      const { initializeSentry } = require('../../utils/sentry');
      const SentryMock = require('@sentry/node');
      initializeSentry();

      expect(SentryMock.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://test@sentry.io/test',
          environment: 'production',
        })
      );
    });

    it('should not initialize Sentry when DSN is not provided', () => {
      delete process.env.SENTRY_DSN;

      jest.resetModules();
      const { initializeSentry } = require('../../utils/sentry');
      const { logger } = require('../../utils/logger');

      initializeSentry();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Sentry DSN not provided - error monitoring disabled'
      );
    });
  });

  describe('captureException', () => {
    it('should capture exception when Sentry is initialized', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/test';

      jest.clearAllMocks();
      jest.resetModules();
      const { initializeSentry, captureException } = require('../../utils/sentry');
      const SentryMock = require('@sentry/node');
      initializeSentry();

      const error = new Error('Test error');
      captureException(error, { userId: '123' });

      expect(SentryMock.withScope).toHaveBeenCalled();
    });

    it('should not capture exception when Sentry is not initialized', () => {
      delete process.env.SENTRY_DSN;

      jest.resetModules();
      const { captureException } = require('../../utils/sentry');

      const error = new Error('Test error');
      captureException(error);

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('captureMessage', () => {
    it('should capture message when Sentry is initialized', () => {
      process.env.SENTRY_DSN = 'https://test@sentry.io/test';

      jest.clearAllMocks();
      jest.resetModules();
      const { initializeSentry, captureMessage } = require('../../utils/sentry');
      const SentryMock = require('@sentry/node');
      initializeSentry();

      captureMessage('Test message', 'warning');

      expect(SentryMock.captureMessage).toHaveBeenCalledWith('Test message', 'warning');
    });

    it('should not capture message when Sentry is not initialized', () => {
      delete process.env.SENTRY_DSN;

      jest.resetModules();
      const { captureMessage } = require('../../utils/sentry');

      captureMessage('Test message');

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });
});

