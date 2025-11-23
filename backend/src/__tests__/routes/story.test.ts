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

describe('Story Routes', () => {
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
      // Mock user for non-database tests
      testUser = { id: 'test-user-id', email: 'test@example.com' };
      authToken = generateTestToken(testUser.id, testUser.email);
    }
  });

  describe('POST /api/v1/story', () => {
    (hasDatabase ? it : it.skip)('should create a new story with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A calming story about a forest',
          theme: 'nature',
          parameters: { length: 'medium' },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.story).toHaveProperty('id');
      expect(response.body.story.title).toBeDefined();
      expect(response.body.story.content).toBeDefined();
      expect(response.body.story.theme).toBe('nature');
    });

    (hasDatabase ? it : it.skip)('should create story with generateVideo flag', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story about the ocean',
          generateVideo: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.story.videoUrl).toBe('pending');
    });

    (hasDatabase ? it : it.skip)('should create story with generateAudio flag', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story about the mountains',
          generateAudio: true,
        });

      expect(response.status).toBe(201);
      expect(response.body.story.audioUrl).toBe('pending');
    });

    (hasDatabase ? it : it.skip)('should sanitize prompt input', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: '<script>alert("xss")</script>A safe story',
          theme: 'nature',
        });

      expect(response.status).toBe(201);
      // The prompt should be sanitized before being sent to OpenAI
      expect(response.body.story).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should handle story without theme', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A generic story',
        });

      expect(response.status).toBe(201);
      expect(response.body.story.theme).toBe('default');
    });

    it('should reject story creation without prompt', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme: 'nature',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject story creation with invalid prompt length', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject story creation without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .send({
          prompt: 'A story',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/story/history', () => {
    beforeEach(async () => {
      if (hasDatabase) {
        await createTestStory(testUser.id, { title: 'Story 1' });
        await createTestStory(testUser.id, { title: 'Story 2' });
      }
    });

    (hasDatabase ? it : it.skip)('should get user story history', async () => {
      const response = await request(app)
        .get('/api/v1/story/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stories).toHaveLength(2);
      expect(response.body.stories[0].title).toBe('Story 2'); // Most recent first
    });

    (hasDatabase ? it : it.skip)('should return empty array for user with no stories', async () => {
      // Create a different user with no stories
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherToken = generateTestToken(otherUser.id, otherUser.email);

      const response = await request(app)
        .get('/api/v1/story/history')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories).toHaveLength(0);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get('/api/v1/story/history');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/story/:id', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should get a specific story', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.story.id).toBe(storyId);
    });

    (hasDatabase ? it : it.skip)('should reject getting non-existent story', async () => {
      const response = await request(app)
        .get('/api/v1/story/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/v1/story/${storyId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/story/:id', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should update a story', async () => {
      const response = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.story.title).toBe('Updated Title');
    });

    (hasDatabase ? it : it.skip)('should update story content', async () => {
      const response = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '<p>Updated content</p>',
        });

      expect(response.status).toBe(200);
      expect(response.body.story.content).toContain('<p>');
    });

    (hasDatabase ? it : it.skip)('should sanitize updated content', async () => {
      const response = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '<script>alert("xss")</script>Safe Title',
          content: '<script>alert("xss")</script><p>Safe content</p>',
        });

      expect(response.status).toBe(200);
      expect(response.body.story.title).not.toContain('<script>');
      expect(response.body.story.content).not.toContain('<script>');
      expect(response.body.story.content).toContain('<p>');
    });

    (hasDatabase ? it : it.skip)('should update story theme', async () => {
      const response = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          theme: 'fantasy',
        });

      expect(response.status).toBe(200);
      expect(response.body.story.theme).toBe('fantasy');
    });

    (hasDatabase ? it : it.skip)('should reject updating non-existent story', async () => {
      const response = await request(app)
        .put('/api/v1/story/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/story/:id', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should delete a story', async () => {
      const response = await request(app)
        .delete(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify story is deleted
      if (hasDatabase) {
        const prisma = getPrismaClient();
        const deletedStory = await prisma.story.findUnique({
          where: { id: storyId },
        });
        expect(deletedStory).toBeNull();
        await prisma.$disconnect();
      }
    });

    (hasDatabase ? it : it.skip)('should reject deleting non-existent story', async () => {
      const response = await request(app)
        .delete('/api/v1/story/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).delete(`/api/v1/story/${storyId}`);

      expect(response.status).toBe(401);
    });

    (hasDatabase ? it : it.skip)('should not allow deleting another user\'s story', async () => {
      // Create another user and story
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherStory = await createTestStory(otherUser.id);
      const otherToken = generateTestToken(otherUser.id, otherUser.email);

      // Try to delete other user's story with first user's token
      const response = await request(app)
        .delete(`/api/v1/story/${otherStory.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404); // Should return 404, not 403
    });
  });
});

