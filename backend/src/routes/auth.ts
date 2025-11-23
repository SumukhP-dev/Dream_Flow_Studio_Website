import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prismaClient as prisma } from "../utils/prisma";
import { createError } from "../middleware/errorHandler";
import { authLimiter } from "../middleware/rateLimiter";
import { validationChains, sanitizeString } from "../utils/validation";
import { generateSecureToken, hashToken, verifyToken } from "../utils/tokenUtils";
import { sendEmail, generatePasswordResetEmail, generateEmailVerificationEmail } from "../services/emailService";
import { logger } from "../utils/logger";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '30d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:19006';

// Helper function to generate tokens
function generateTokens(userId: string, email: string) {
  if (!JWT_SECRET) {
    throw createError('JWT_SECRET not configured', 500);
  }

  const accessToken = jwt.sign(
    { userId, email, type: 'access' },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    { userId, email, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
}

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 */
router.post(
  "/signup",
  authLimiter,
  [validationChains.email(), validationChains.password(), validationChains.name()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name } = req.body;
      const sanitizedName = name ? sanitizeString(name) : null;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw createError("User already exists", 409);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: sanitizedName,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      });

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email);

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: hashToken(refreshToken),
          expiresAt,
        },
      });

      // Send email verification (optional, can be done async)
      try {
        const verificationToken = generateSecureToken();
        const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const emailContent = generateEmailVerificationEmail(verificationUrl);
        // Store verification token in user record or separate table if needed
        // For now, we'll skip this to keep it simple
      } catch (error) {
        logger.warn('Failed to send verification email', { error });
      }

      res.status(201).json({
        success: true,
        user,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post(
  "/login",
  authLimiter,
  [validationChains.email(), body("password").notEmpty().trim()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw createError("Invalid credentials", 401);
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        throw createError("Invalid credentials", 401);
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.email);

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: hashToken(refreshToken),
          expiresAt,
        },
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 */
router.post(
  "/refresh",
  authLimiter,
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { refreshToken } = req.body;

      // Verify refresh token
      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (error) {
        throw createError("Invalid refresh token", 401);
      }

      if (decoded.type !== 'refresh') {
        throw createError("Invalid token type", 401);
      }

      // Check if refresh token exists in database
      const tokenHash = hashToken(refreshToken);
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          userId: decoded.userId,
          token: tokenHash,
          expiresAt: { gt: new Date() },
        },
      });

      if (!storedToken) {
        throw createError("Refresh token not found or expired", 401);
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        decoded.userId,
        decoded.email
      );

      // Update refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: hashToken(newRefreshToken),
          expiresAt,
        },
      });

      res.json({
        success: true,
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user (revoke refresh token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 */
router.post(
  "/logout",
  [body("refreshToken").notEmpty().withMessage("Refresh token is required")],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { refreshToken } = req.body;

      // Delete refresh token from database
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshToken.deleteMany({
        where: {
          token: tokenHash,
        },
      });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 */
router.post(
  "/forgot-password",
  authLimiter,
  [validationChains.email()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      // Don't reveal if user exists (security best practice)
      if (!user) {
        // Still return success to prevent email enumeration
        return res.json({
          success: true,
          message: "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Generate reset token
      const resetToken = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

      // Store reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashToken(resetToken),
          expiresAt,
        },
      });

      // Send reset email
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
      const emailContent = generatePasswordResetEmail(resetUrl);

      try {
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (error) {
        logger.error("Failed to send password reset email", { error, email });
        // Don't fail the request if email fails
      }

      res.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 */
router.post(
  "/reset-password",
  authLimiter,
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    validationChains.password(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      // Find reset token
      const tokenHash = hashToken(token);
      const resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          token: tokenHash,
          expiresAt: { gt: new Date() },
          used: false,
        },
        include: {
          user: true,
        },
      });

      if (!resetToken) {
        throw createError("Invalid or expired reset token", 400);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      // Delete all refresh tokens for this user (force re-login)
      await prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      });

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRoutes };

