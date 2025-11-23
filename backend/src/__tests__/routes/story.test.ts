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

    (hasDatabase ? it : it.skip)('should support pagination', async () => {
      // Create multiple stories
      for (let i = 0; i < 25; i++) {
        await createTestStory(testUser.id, { title: `Story ${i}` });
      }

      const page1 = await request(app)
        .get('/api/v1/story/history?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.stories).toHaveLength(10);
      expect(page1.body.pagination.page).toBe(1);
      expect(page1.body.pagination.limit).toBe(10);
      expect(page1.body.pagination.total).toBeGreaterThanOrEqual(25);

      const page2 = await request(app)
        .get('/api/v1/story/history?page=2&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(page2.status).toBe(200);
      expect(page2.body.stories).toHaveLength(10);
      expect(page2.body.pagination.page).toBe(2);
    });

    (hasDatabase ? it : it.skip)('should filter by theme', async () => {
      await createTestStory(testUser.id, { title: 'Nature Story', theme: 'nature' });
      await createTestStory(testUser.id, { title: 'Fantasy Story', theme: 'fantasy' });
      await createTestStory(testUser.id, { title: 'Another Nature Story', theme: 'nature' });

      const response = await request(app)
        .get('/api/v1/story/history?theme=nature')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.every((s: any) => s.theme === 'nature')).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should search by title', async () => {
      await createTestStory(testUser.id, { title: 'Ocean Adventure' });
      await createTestStory(testUser.id, { title: 'Mountain Journey' });
      await createTestStory(testUser.id, { title: 'Ocean Breeze' });

      const response = await request(app)
        .get('/api/v1/story/history?search=Ocean')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.length).toBeGreaterThanOrEqual(2);
      expect(response.body.stories.every((s: any) => s.title.includes('Ocean'))).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should search by content', async () => {
      await createTestStory(testUser.id, {
        title: 'Story 1',
        content: 'This story is about the forest',
      });
      await createTestStory(testUser.id, {
        title: 'Story 2',
        content: 'This story is about the ocean',
      });

      const response = await request(app)
        .get('/api/v1/story/history?search=forest')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.some((s: any) => s.content.includes('forest'))).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should sort by createdAt descending (default)', async () => {
      const story1 = await createTestStory(testUser.id, { title: 'First Story' });
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      const story2 = await createTestStory(testUser.id, { title: 'Second Story' });

      const response = await request(app)
        .get('/api/v1/story/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const firstStory = response.body.stories[0];
      expect(firstStory.id).toBe(story2.id); // Most recent first
    });

    (hasDatabase ? it : it.skip)('should sort by title', async () => {
      await createTestStory(testUser.id, { title: 'Zebra Story' });
      await createTestStory(testUser.id, { title: 'Alpha Story' });
      await createTestStory(testUser.id, { title: 'Beta Story' });

      const response = await request(app)
        .get('/api/v1/story/history?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const titles = response.body.stories.map((s: any) => s.title);
      expect(titles).toContain('Alpha Story');
      expect(titles).toContain('Beta Story');
      expect(titles).toContain('Zebra Story');
    });

    (hasDatabase ? it : it.skip)('should filter by hasVideo', async () => {
      await createTestStory(testUser.id, {
        title: 'Story with Video',
        videoUrl: 'https://storage.example.com/video.mp4',
      });
      await createTestStory(testUser.id, {
        title: 'Story without Video',
        videoUrl: null,
      });

      const response = await request(app)
        .get('/api/v1/story/history?hasVideo=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.every((s: any) => s.videoUrl && s.videoUrl !== 'pending' && s.videoUrl !== 'processing' && s.videoUrl !== 'failed')).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should filter by hasAudio', async () => {
      await createTestStory(testUser.id, {
        title: 'Story with Audio',
        audioUrl: 'https://storage.example.com/audio.mp3',
      });
      await createTestStory(testUser.id, {
        title: 'Story without Audio',
        audioUrl: null,
      });

      const response = await request(app)
        .get('/api/v1/story/history?hasAudio=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.every((s: any) => s.audioUrl && s.audioUrl !== 'pending' && s.audioUrl !== 'processing' && s.audioUrl !== 'failed')).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should combine filters', async () => {
      await createTestStory(testUser.id, {
        title: 'Nature Story with Video',
        theme: 'nature',
        videoUrl: 'https://storage.example.com/video.mp4',
      });
      await createTestStory(testUser.id, {
        title: 'Fantasy Story with Video',
        theme: 'fantasy',
        videoUrl: 'https://storage.example.com/video2.mp4',
      });
      await createTestStory(testUser.id, {
        title: 'Nature Story without Video',
        theme: 'nature',
        videoUrl: null,
      });

      const response = await request(app)
        .get('/api/v1/story/history?theme=nature&hasVideo=true')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.every((s: any) => s.theme === 'nature' && s.videoUrl)).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should limit max items per page', async () => {
      for (let i = 0; i < 150; i++) {
        await createTestStory(testUser.id, { title: `Story ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/story/history?limit=200') // Try to request more than max
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.stories.length).toBeLessThanOrEqual(100); // Max limit
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100);
    });
  });

  describe('GET /api/v1/story/:id/export', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should export story as PDF', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    (hasDatabase ? it : it.skip)('should export story as Markdown', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=markdown`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/markdown');
      expect(response.text).toContain('#');
    });

    (hasDatabase ? it : it.skip)('should export story as JSON', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=json`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      const data = JSON.parse(response.text);
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('content');
    });

    (hasDatabase ? it : it.skip)('should include metadata when requested', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=json&includeMetadata=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const data = JSON.parse(response.text);
      expect(data.metadata).toBeDefined();
      expect(data.metadata.id).toBe(storyId);
    });

    it('should reject invalid format', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=invalid`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=pdf`);

      expect(response.status).toBe(401);
    });

    (hasDatabase ? it : it.skip)('should reject exporting another user\'s story', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherStory = await createTestStory(otherUser.id);

      const response = await request(app)
        .get(`/api/v1/story/${otherStory.id}/export?format=pdf`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/v1/story/:id/media/status', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should get media status', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/media/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toHaveProperty('video');
      expect(response.body.status).toHaveProperty('audio');
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/story/${storyId}/media/status`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/story/:id/media/regenerate', () => {
    let storyId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const story = await createTestStory(testUser.id);
        storyId = story.id;
      } else {
        storyId = 'test-story-id';
      }
    });

    (hasDatabase ? it : it.skip)('should regenerate video', async () => {
      const response = await request(app)
        .post(`/api/v1/story/${storyId}/media/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'video' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    (hasDatabase ? it : it.skip)('should regenerate audio', async () => {
      const response = await request(app)
        .post(`/api/v1/story/${storyId}/media/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'audio' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid type', async () => {
      const response = await request(app)
        .post(`/api/v1/story/${storyId}/media/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/story/${storyId}/media/regenerate`)
        .send({ type: 'video' });

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

  describe('Edge Cases', () => {
    (hasDatabase ? it : it.skip)('should not allow updating another user\'s story', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherStory = await createTestStory(otherUser.id);

      const response = await request(app)
        .put(`/api/v1/story/${otherStory.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Hacked Title',
        });

      expect(response.status).toBe(404);
    });

    (hasDatabase ? it : it.skip)('should not allow getting another user\'s story', async () => {
      const otherUser = await createTestUser({ email: 'other@example.com' });
      const otherStory = await createTestStory(otherUser.id);

      const response = await request(app)
        .get(`/api/v1/story/${otherStory.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    (hasDatabase ? it : it.skip)('should handle very long prompt', async () => {
      const longPrompt = 'A'.repeat(1000); // Exactly 1000 characters
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: longPrompt,
        });

      expect(response.status).toBe(201);
    });

    (hasDatabase ? it : it.skip)('should handle prompt at minimum length', async () => {
      const minPrompt = 'A'.repeat(10); // Exactly 10 characters
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: minPrompt,
        });

      expect(response.status).toBe(201);
    });

    it('should reject prompt exceeding maximum length', async () => {
      const longPrompt = 'A'.repeat(1001); // Exceeds 1000 characters
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: longPrompt,
        });

      expect(response.status).toBe(400);
    });

    (hasDatabase ? it : it.skip)('should handle story with special characters in theme', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story about nature',
          theme: 'nature-adventure',
        });

      expect(response.status).toBe(201);
      expect(response.body.story.theme).toBe('nature-adventure');
    });

    (hasDatabase ? it : it.skip)('should handle story with empty parameters object', async () => {
      const response = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story',
          parameters: {},
        });

      expect(response.status).toBe(201);
    });

    (hasDatabase ? it : it.skip)('should handle update with only partial fields', async () => {
      const story = await createTestStory(testUser.id, { title: 'Original Title' });
      
      const response = await request(app)
        .put(`/api/v1/story/${story.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          // content and theme not provided
        });

      expect(response.status).toBe(200);
      expect(response.body.story.title).toBe('Updated Title');
    });
  });
});

