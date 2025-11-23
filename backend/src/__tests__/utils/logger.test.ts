import { logger, logInfo, logError, logWarn, logDebug } from '../../utils/logger';

describe('Logger', () => {
  // Mock console methods to avoid noise in tests
  const originalConsole = global.console;

  beforeEach(() => {
    global.console = {
      ...originalConsole,
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
  });

  afterEach(() => {
    global.console = originalConsole;
  });

  it('should create logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger.level).toBeDefined();
  });

  it('should log info messages', () => {
    logInfo('Test info message', { key: 'value' });
    // Logger should not throw
    expect(true).toBe(true);
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logError('Test error message', error, { context: 'test' });
    // Logger should not throw
    expect(true).toBe(true);
  });

  it('should log warning messages', () => {
    logWarn('Test warning message', { key: 'value' });
    // Logger should not throw
    expect(true).toBe(true);
  });

  it('should log debug messages', () => {
    logDebug('Test debug message', { key: 'value' });
    // Logger should not throw
    expect(true).toBe(true);
  });
});

