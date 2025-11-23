import request from 'supertest';
import express, { Express } from 'express';
import { apiLimiter, authLimiter, storyGenerationLimiter } from '../../middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('apiLimiter', () => {
    beforeEach(() => {
      app.use('/test', apiLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('authLimiter', () => {
    beforeEach(() => {
      // Create endpoint that simulates failed auth attempts
      app.post('/auth', authLimiter, (req, res) => {
        // Simulate failed authentication (returns 401)
        // This will count towards the rate limit since skipSuccessfulRequests is true
        res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
      });
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).post('/auth');
      expect(response.status).toBe(401); // Failed auth, but within limit
    });

    it('should reject too many failed requests', async () => {
      // Make 6 failed requests (limit is 5)
      // Since skipSuccessfulRequests is true, only failed requests count
      for (let i = 0; i < 5; i++) {
        await request(app).post('/auth');
      }
      // 6th request should be rate limited
      const response = await request(app).post('/auth');
      expect(response.status).toBe(429);
    });
  });

  describe('storyGenerationLimiter', () => {
    beforeEach(() => {
      app.post('/story', storyGenerationLimiter, (req, res) => {
        res.json({ success: true });
      });
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).post('/story');
      expect(response.status).toBe(200);
    });
  });
});

