import request from 'supertest';
import app from '../../server';
import {
  createTestUser,
  cleanupTestData,
  generateTestToken,
  TestUser,
} from '../helpers/testHelpers';

const hasDatabase = !!(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

describe('Auth Routes', () => {
  beforeAll(() => {
    if (!hasDatabase) {
      console.warn('Skipping database tests: DATABASE_URL not set');
    }
  });

  beforeEach(async () => {
    if (hasDatabase) {
      await cleanupTestData();
    }
  });

  describe('POST /api/v1/auth/signup', () => {
    (hasDatabase ? it : it.skip)('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.password).toBeUndefined();
    });

    (hasDatabase ? it : it.skip)('should reject signup with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should reject signup with short password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'user@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should reject signup with existing email', async () => {
      await createTestUser({ email: 'existing@example.com' });

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error.message).toContain('already exists');
    });

    (hasDatabase ? it : it.skip)('should create user without name', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: 'noname@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.user.name).toBeNull();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      if (hasDatabase) {
        await createTestUser({
          email: 'login@example.com',
          password: 'TestPassword123!',
        });
      }
    });

    (hasDatabase ? it : it.skip)('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    (hasDatabase ? it : it.skip)('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid credentials');
    });

    it('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: TestUser;
    let refreshToken: string;

    beforeEach(async () => {
      if (hasDatabase) {
        testUser = await createTestUser({
          email: 'refresh@example.com',
          password: 'TestPassword123!',
        });

        // Create a refresh token in database
        const { prismaClient } = await import('../../utils/prisma');
        const { hashToken } = await import('../../utils/tokenUtils');
        const token = generateTestToken(testUser.id, testUser.email, 'refresh');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await prismaClient.refreshToken.create({
          data: {
            userId: testUser.id,
            token: hashToken(token),
            expiresAt,
          },
        });

        refreshToken = token;
      }
    });

    (hasDatabase ? it : it.skip)('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.refreshToken).not.toBe(refreshToken); // Should be rotated
    });

    (hasDatabase ? it : it.skip)('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toContain('Invalid refresh token');
    });

    (hasDatabase ? it : it.skip)('should reject refresh with missing token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: TestUser;
    let refreshToken: string;

    beforeEach(async () => {
      if (hasDatabase) {
        testUser = await createTestUser({
          email: 'logout@example.com',
          password: 'TestPassword123!',
        });

        const { prismaClient } = await import('../../utils/prisma');
        const { hashToken } = await import('../../utils/tokenUtils');
        const token = generateTestToken(testUser.id, testUser.email, 'refresh');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await prismaClient.refreshToken.create({
          data: {
            userId: testUser.id,
            token: hashToken(token),
            expiresAt,
          },
        });

        refreshToken = token;
      }
    });

    (hasDatabase ? it : it.skip)('should logout and revoke refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify token is deleted
      const { prismaClient } = await import('../../utils/prisma');
      const { hashToken } = await import('../../utils/tokenUtils');
      const tokenHash = hashToken(refreshToken);
      const tokenExists = await prismaClient.refreshToken.findFirst({
        where: { token: tokenHash },
      });

      expect(tokenExists).toBeNull();
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      if (hasDatabase) {
        await createTestUser({
          email: 'forgot@example.com',
          password: 'TestPassword123!',
        });
      }
    });

    (hasDatabase ? it : it.skip)('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'forgot@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify reset token was created
      const { prismaClient } = await import('../../utils/prisma');
      const user = await prismaClient.user.findUnique({
        where: { email: 'forgot@example.com' },
      });

      const resetToken = await prismaClient.passwordResetToken.findFirst({
        where: { userId: user!.id },
      });

      expect(resetToken).toBeDefined();
      expect(resetToken!.used).toBe(false);
    });

    (hasDatabase ? it : it.skip)('should return success even for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let testUser: TestUser;
    let resetToken: string;

    beforeEach(async () => {
      if (hasDatabase) {
        testUser = await createTestUser({
          email: 'reset@example.com',
          password: 'OldPassword123!',
        });

        const { prismaClient } = await import('../../utils/prisma');
        const { generateSecureToken, hashToken } = await import('../../utils/tokenUtils');
        resetToken = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await prismaClient.passwordResetToken.create({
          data: {
            userId: testUser.id,
            token: hashToken(resetToken),
            expiresAt,
          },
        });
      }
    });

    (hasDatabase ? it : it.skip)('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify password was changed
      const { prismaClient } = await import('../../utils/prisma');
      const user = await prismaClient.user.findUnique({
        where: { id: testUser.id },
      });

      const bcrypt = require('bcrypt');
      const isValid = await bcrypt.compare('NewPassword123!', user!.password);
      expect(isValid).toBe(true);

      // Verify token was marked as used
      const { hashToken } = await import('../../utils/tokenUtils');
      const tokenHash = hashToken(resetToken);
      const usedToken = await prismaClient.passwordResetToken.findFirst({
        where: { token: tokenHash },
      });
      expect(usedToken!.used).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid or expired reset token');
    });

    (hasDatabase ? it : it.skip)('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});

