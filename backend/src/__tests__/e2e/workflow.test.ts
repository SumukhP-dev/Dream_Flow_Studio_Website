import request from 'supertest';
import app from '../../server';
import {
  createTestUser,
  generateTestToken,
  cleanupTestData,
} from '../helpers/testHelpers';

const hasDatabase = !!(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

describe('E2E Creator Workflow', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn('Skipping E2E tests: DATABASE_URL not set');
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

  (hasDatabase ? describe : describe.skip)('Complete Creator Journey', () => {
    it('should complete full workflow: signup -> generate -> edit -> export', async () => {
      // Step 1: Generate a story
      const generateResponse = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A calming story about a peaceful forest',
          theme: 'nature',
          generateVideo: true,
          generateAudio: true,
        });

      expect(generateResponse.status).toBe(201);
      const storyId = generateResponse.body.story.id;

      // Step 2: Get the story
      const getResponse = await request(app)
        .get(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.story.id).toBe(storyId);

      // Step 3: Edit the story
      const updateResponse = await request(app)
        .put(`/api/v1/story/${storyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Forest Story',
          content: '<p>Updated content about the peaceful forest.</p>',
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.story.title).toBe('Updated Forest Story');

      // Step 4: Check media status
      const statusResponse = await request(app)
        .get(`/api/v1/story/${storyId}/media/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status).toHaveProperty('video');
      expect(statusResponse.body.status).toHaveProperty('audio');

      // Step 5: Export the story
      const exportResponse = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=pdf&includeMetadata=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(exportResponse.status).toBe(200);
      expect(exportResponse.headers['content-type']).toContain('application/pdf');

      // Step 6: Get story history
      const historyResponse = await request(app)
        .get('/api/v1/story/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.stories.length).toBeGreaterThan(0);
      expect(historyResponse.body.stories.some((s: any) => s.id === storyId)).toBe(true);
    });

    it('should handle library management workflow', async () => {
      // Create multiple stories with different themes
      const stories = [];
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/v1/story')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prompt: `Story ${i} about nature`,
            theme: i % 2 === 0 ? 'nature' : 'fantasy',
          });
        stories.push(response.body.story);
      }

      // Test pagination
      const page1 = await request(app)
        .get('/api/v1/story/history?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`);

      expect(page1.status).toBe(200);
      expect(page1.body.stories.length).toBe(2);
      expect(page1.body.pagination.total).toBe(5);

      // Test filtering by theme
      const natureStories = await request(app)
        .get('/api/v1/story/history?theme=nature')
        .set('Authorization', `Bearer ${authToken}`);

      expect(natureStories.status).toBe(200);
      expect(natureStories.body.stories.every((s: any) => s.theme === 'nature')).toBe(true);

      // Test search
      const searchResponse = await request(app)
        .get('/api/v1/story/history?search=Story')
        .set('Authorization', `Bearer ${authToken}`);

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.stories.length).toBeGreaterThan(0);

      // Test sorting
      const sortedResponse = await request(app)
        .get('/api/v1/story/history?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${authToken}`);

      expect(sortedResponse.status).toBe(200);
    });

    it('should handle bulk operations workflow', async () => {
      // Create multiple stories
      const storyIds = [];
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/story')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            prompt: `Bulk story ${i}`,
          });
        storyIds.push(response.body.story.id);
      }

      // Delete stories one by one
      for (const storyId of storyIds) {
        const deleteResponse = await request(app)
          .delete(`/api/v1/story/${storyId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(deleteResponse.status).toBe(200);
      }

      // Verify all deleted
      const historyResponse = await request(app)
        .get('/api/v1/story/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(historyResponse.status).toBe(200);
      const remainingIds = historyResponse.body.stories.map((s: any) => s.id);
      storyIds.forEach(id => {
        expect(remainingIds).not.toContain(id);
      });
    });

    it('should handle media generation workflow', async () => {
      // Create story with media generation
      const generateResponse = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story for media generation',
          generateVideo: true,
          generateAudio: true,
        });

      expect(generateResponse.status).toBe(201);
      const storyId = generateResponse.body.story.id;
      expect(generateResponse.body.story.videoUrl).toBe('pending');
      expect(generateResponse.body.story.audioUrl).toBe('pending');

      // Check media status
      const statusResponse = await request(app)
        .get(`/api/v1/story/${storyId}/media/status`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.status.video).toBe('pending');
      expect(statusResponse.body.status.audio).toBe('pending');

      // Regenerate video
      const regenerateResponse = await request(app)
        .post(`/api/v1/story/${storyId}/media/regenerate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'video' });

      expect(regenerateResponse.status).toBe(200);
    });

    it('should handle export workflow with different formats', async () => {
      // Create a story
      const generateResponse = await request(app)
        .post('/api/v1/story')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'A story for export testing',
          theme: 'calming',
        });

      const storyId = generateResponse.body.story.id;

      // Export as PDF
      const pdfResponse = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=pdf&includeMetadata=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(pdfResponse.status).toBe(200);
      expect(pdfResponse.headers['content-type']).toContain('application/pdf');

      // Export as Markdown
      const mdResponse = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=markdown&includeMetadata=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(mdResponse.status).toBe(200);
      expect(mdResponse.headers['content-type']).toContain('text/markdown');
      expect(mdResponse.text).toContain('#');

      // Export as JSON
      const jsonResponse = await request(app)
        .get(`/api/v1/story/${storyId}/export?format=json&includeMetadata=true`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(jsonResponse.status).toBe(200);
      expect(jsonResponse.headers['content-type']).toContain('application/json');
      const data = JSON.parse(jsonResponse.text);
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('content');
      expect(data.metadata).toBeDefined();
    });
  });
});

