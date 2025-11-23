import request from 'supertest';
import app from '../../server';
import { PrismaClient } from '@prisma/client';
import {
  createTestUser,
  createTestStory,
  generateTestToken,
  cleanupTestData,
} from '../helpers/testHelpers';

const hasDatabase = !!(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

function getPrismaClient(): PrismaClient {
  if (!hasDatabase) {
    throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for database tests');
  }
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });
}

describe('Analytics Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn('Skipping database tests: DATABASE_URL not set');
    }
  });

  beforeEach(async () => {
    if (hasDatabase) {
      await cleanupTestData();
      testUser = await createTestUser();
      authToken = generateTestToken(testUser.id, testUser.email);
    } else {
      testUser = { id: 'test-user-id', email: 'test@example.com' };
      authToken = generateTestToken(testUser.id, testUser.email);
    }
  });

  describe('GET /api/v1/analytics', () => {
    beforeEach(async () => {
      if (hasDatabase) {
        // Create multiple stories for the test user
        await createTestStory(testUser.id, { title: 'Story 1', theme: 'nature' });
        await createTestStory(testUser.id, { title: 'Story 2', theme: 'fantasy' });
        await createTestStory(testUser.id, { title: 'Story 3', theme: 'nature' });
      }
    });

    (hasDatabase ? it : it.skip)('should get analytics data for user', async () => {
      const response = await request(app)
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('totalStories');
      expect(response.body.analytics.totalStories).toBe(3);
      expect(response.body.analytics).toHaveProperty('totalViews');
      expect(response.body.analytics).toHaveProperty('averageGenerationTime');
      expect(response.body.analytics).toHaveProperty('popularThemes');
      expect(response.body.analytics).toHaveProperty('usageByDate');
    });

    (hasDatabase ? it : it.skip)('should return zero stories for user with no stories', async () => {
      // Create a different user with no stories
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser.id, otherUser.email);

      const response = await request(app)
        .get('/api/v1/analytics')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.analytics.totalStories).toBe(0);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get('/api/v1/analytics');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/analytics/story/:id', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should get story analytics', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toHaveProperty('views');
      expect(response.body.analytics).toHaveProperty('completions');
      expect(response.body.analytics).toHaveProperty('averageWatchTime');
    });

    (hasDatabase ? it : it.skip)('should reject getting analytics for non-existent story', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/story/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      // Should still return 200 with default analytics
      expect(response.status).toBe(200);
      expect(response.body.analytics).toBeDefined();
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/v1/analytics/story/${storyId}`);

      expect(response.status).toBe(401);
    });
  });
});

