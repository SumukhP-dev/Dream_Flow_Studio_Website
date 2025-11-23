import { storyApi } from '@/lib/api/story';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

describe('Story API', () => {
  beforeEach(() => {
    // Clear any mocks
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate a story', async () => {
      const result = await storyApi.generate({
        prompt: 'A calming story about a forest',
        theme: 'nature',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('content');
      expect(result.theme).toBe('nature');
    });

    it('should handle API errors', async () => {
      server.use(
        http.post('*/story', () => {
          return HttpResponse.json(
            { success: false, error: { message: 'Generation failed' } },
            { status: 500 }
          );
        })
      );

      await expect(
        storyApi.generate({ prompt: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('getHistory', () => {
    it('should fetch story history', async () => {
      const stories = await storyApi.getHistory();
      expect(Array.isArray(stories)).toBe(true);
      expect(stories.length).toBeGreaterThan(0);
    });
  });

  describe('getById', () => {
    it('should fetch a story by id', async () => {
      const story = await storyApi.getById('test-story-id');
      expect(story).toHaveProperty('id');
      expect(story.id).toBe('test-story-id');
    });
  });

  describe('update', () => {
    it('should update a story', async () => {
      const updated = await storyApi.update('test-story-id', {
        title: 'Updated Title',
      });
      expect(updated.title).toBe('Updated Title');
    });
  });

  describe('delete', () => {
    it('should delete a story', async () => {
      await expect(
        storyApi.delete('test-story-id')
      ).resolves.not.toThrow();
    });
  });
});

