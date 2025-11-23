import { sendEmail, generatePasswordResetEmail, generateEmailVerificationEmail } from '../../services/emailService';

// Mock nodemailer
jest.mock('nodemailer', () => {
  const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
  return {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
    })),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Email Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('sendEmail', () => {
    it('should send email when SMTP is configured', async () => {
      process.env.SMTP_HOST = 'smtp.test.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASS = 'password';
      process.env.SMTP_FROM = 'noreply@test.com';

      // Reload module to pick up new env vars
      jest.resetModules();
      const { sendEmail } = await import('../../services/emailService');

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test Text',
      });

      const nodemailer = require('nodemailer');
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it('should log email when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;

      jest.resetModules();
      const { sendEmail } = await import('../../services/emailService');
      const { logger } = await import('../../utils/logger');

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Email (not sent - SMTP not configured)'),
        expect.any(Object)
      );
    });
  });

  describe('generatePasswordResetEmail', () => {
    it('should generate password reset email with reset URL', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const { subject, html } = generatePasswordResetEmail(resetUrl);

      expect(subject).toContain('Reset Your Password');
      expect(html).toContain(resetUrl);
      expect(html).toContain('Reset Password');
    });

    it('should include proper HTML structure', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const { html } = generatePasswordResetEmail(resetUrl);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });
  });

  describe('generateEmailVerificationEmail', () => {
    it('should generate verification email with verification URL', () => {
      const verificationUrl = 'https://example.com/verify?token=abc123';
      const { subject, html } = generateEmailVerificationEmail(verificationUrl);

      expect(subject).toContain('Verify Your Email');
      expect(html).toContain(verificationUrl);
      expect(html).toContain('Verify Email');
    });

    it('should include proper HTML structure', () => {
      const verificationUrl = 'https://example.com/verify?token=abc123';
      const { html } = generateEmailVerificationEmail(verificationUrl);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
    });
  });
});

