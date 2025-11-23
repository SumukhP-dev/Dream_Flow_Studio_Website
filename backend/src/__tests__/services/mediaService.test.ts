import { queueMediaGeneration, getMediaStatus, regenerateMedia } from '../../services/mediaService';
import { prismaClient as prisma } from '../../utils/prisma';
import { resetProviders } from '../../services/providers';

// Mock the providers
jest.mock('../../services/providers', () => ({
  getVideoProvider: jest.fn(() => ({
    getName: () => 'placeholder',
    generate: jest.fn().mockResolvedValue({
      videoUrl: 'https://storage.example.com/video.mp4',
      duration: 5,
      cost: 0,
    }),
  })),
  getAudioProvider: jest.fn(() => ({
    getName: () => 'placeholder',
    generate: jest.fn().mockResolvedValue({
      audioUrl: 'https://storage.example.com/audio.mp3',
      duration: 60,
      cost: 0,
    }),
  })),
  resetProviders: jest.fn(),
}));

// Mock Redis/BullMQ
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

describe('MediaService', () => {
  const mockUserId = 'test-user-id';
  const mockStoryId = 'test-story-id';

  beforeEach(async () => {
    // Create test user and story
    await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        email: 'test@example.com',
        password: 'hashed-password',
      },
    });

    await prisma.story.upsert({
      where: { id: mockStoryId },
      update: {},
      create: {
        id: mockStoryId,
        userId: mockUserId,
        title: 'Test Story',
        content: 'Test content',
        theme: 'calming',
        parameters: {},
      },
    });
  });

  afterEach(async () => {
    await prisma.story.deleteMany({ where: { userId: mockUserId } });
    await prisma.user.deleteMany({ where: { email: 'test@example.com' } });
    resetProviders();
  });

  describe('queueMediaGeneration', () => {
    it('should queue video generation job', async () => {
      await queueMediaGeneration(
        mockStoryId,
        'video',
        'Test content',
        'Test Story',
        'calming'
      );

      const story = await prisma.story.findUnique({
        where: { id: mockStoryId },
      });

      expect(story?.videoUrl).toBe('pending');
    });

    it('should queue audio generation job', async () => {
      await queueMediaGeneration(
        mockStoryId,
        'audio',
        'Test content',
        'Test Story',
        'calming'
      );

      const story = await prisma.story.findUnique({
        where: { id: mockStoryId },
      });

      expect(story?.audioUrl).toBe('pending');
    });

    it('should handle missing Redis gracefully', async () => {
      // This will use the fallback behavior
      await queueMediaGeneration(
        mockStoryId,
        'video',
        'Test content',
        'Test Story'
      );

      const story = await prisma.story.findUnique({
        where: { id: mockStoryId },
      });

      expect(story?.videoUrl).toBe('pending');
    });
  });

  describe('getMediaStatus', () => {
    it('should return pending status for new story', async () => {
      const status = await getMediaStatus(mockStoryId);

      expect(status.video).toBe('pending');
      expect(status.audio).toBe('pending');
    });

    it('should return processing status', async () => {
      await prisma.story.update({
        where: { id: mockStoryId },
        data: { videoUrl: 'processing' },
      });

      const status = await getMediaStatus(mockStoryId);
      expect(status.video).toBe('processing');
    });

    it('should return completed status', async () => {
      await prisma.story.update({
        where: { id: mockStoryId },
        data: {
          videoUrl: 'https://storage.example.com/video.mp4',
          audioUrl: 'https://storage.example.com/audio.mp3',
        },
      });

      const status = await getMediaStatus(mockStoryId);
      expect(status.video).toBe('completed');
      expect(status.audio).toBe('completed');
    });

    it('should return failed status', async () => {
      await prisma.story.update({
        where: { id: mockStoryId },
        data: { videoUrl: 'failed' },
      });

      const status = await getMediaStatus(mockStoryId);
      expect(status.video).toBe('failed');
    });

    it('should throw error for non-existent story', async () => {
      await expect(getMediaStatus('non-existent-id')).rejects.toThrow(
        'Story not found'
      );
    });
  });

  describe('regenerateMedia', () => {
    it('should queue video regeneration', async () => {
      await regenerateMedia(
        mockStoryId,
        'video',
        'Test content',
        'Test Story',
        'calming'
      );

      const story = await prisma.story.findUnique({
        where: { id: mockStoryId },
      });

      expect(story?.videoUrl).toBe('pending');
    });

    it('should queue audio regeneration', async () => {
      await regenerateMedia(
        mockStoryId,
        'audio',
        'Test content',
        'Test Story',
        'calming'
      );

      const story = await prisma.story.findUnique({
        where: { id: mockStoryId },
      });

      expect(story?.audioUrl).toBe('pending');
    });
  });
});

