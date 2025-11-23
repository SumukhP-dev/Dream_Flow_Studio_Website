import request from 'supertest';
import app from '../../server';
import { createTestUser, cleanupTestData } from '../helpers/testHelpers';

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
      expect(response.body.token).toBeDefined();
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
      expect(response.body.token).toBeDefined();
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
});

