import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // If SMTP is not configured, return null (emails will be logged only)
  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    logger.warn('SMTP not configured - emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const emailTransporter = getEmailTransporter();
  const fromEmail = process.env.SMTP_FROM || 'noreply@dreamflowstudio.com';

  const mailOptions = {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
  };

  try {
    if (emailTransporter) {
      await emailTransporter.sendMail(mailOptions);
      logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    } else {
      // In development or when SMTP is not configured, log the email
      logger.info('Email (not sent - SMTP not configured)', {
        to: options.to,
        subject: options.subject,
        html: options.html,
      });
    }
  } catch (error) {
    logger.error('Failed to send email', { error, to: options.to, subject: options.subject });
    throw new Error('Failed to send email');
  }
}

export function generatePasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  const subject = 'Reset Your Password - Dream Flow Studio';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password for Dream Flow Studio.</p>
        <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
        <a href="${resetUrl}" class="button">Reset Password</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        <p>If you didn't request this, please ignore this email.</p>
        <div class="footer">
          <p>Dream Flow Studio</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateEmailVerificationEmail(verificationUrl: string): { subject: string; html: string } {
  const subject = 'Verify Your Email - Dream Flow Studio';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Verify Your Email</h2>
        <p>Thank you for signing up for Dream Flow Studio!</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" class="button">Verify Email</a>
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <div class="footer">
          <p>Dream Flow Studio</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

