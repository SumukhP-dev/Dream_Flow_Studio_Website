import { RunwayVideoProvider } from '../../../services/providers/runwayVideoProvider';
import axios from 'axios';
import { getStorageService } from '../../../services/storageService';

jest.mock('axios');
jest.mock('../../../services/storageService');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetStorageService = getStorageService as jest.MockedFunction<typeof getStorageService>;

describe('RunwayVideoProvider', () => {
  let provider: RunwayVideoProvider;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RUNWAY_API_KEY = mockApiKey;
    provider = new RunwayVideoProvider();
  });

  afterEach(() => {
    delete process.env.RUNWAY_API_KEY;
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('runwayml');
    });
  });

  describe('generate', () => {
    const mockParams = {
      storyId: 'test-story-id',
      content: 'Test story content',
      title: 'Test Story',
      theme: 'calming',
    };

    it('should throw error if API key not configured', async () => {
      const providerWithoutKey = new RunwayVideoProvider('');
      
      await expect(providerWithoutKey.generate(mockParams)).rejects.toThrow(
        'RunwayML API key not configured'
      );
    });

    it('should generate video successfully', async () => {
      const mockGenerationId = 'gen-123';
      const mockVideoUrl = 'https://example.com/video.mp4';
      const mockVideoBuffer = Buffer.from('mock video data');

      // Mock initial generation request
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: mockGenerationId },
      });

      // Mock status check - processing
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'processing' },
      });

      // Mock status check - completed
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'completed', output: [mockVideoUrl] },
      });

      // Mock video download
      mockedAxios.get.mockResolvedValueOnce({
        data: mockVideoBuffer,
      });

      // Mock storage service
      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/video.mp4',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      const result = await provider.generate(mockParams);

      expect(result.videoUrl).toBe('https://storage.example.com/video.mp4');
      expect(result.duration).toBe(5);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/generations'),
        expect.objectContaining({
          model: 'gen2',
          prompt: expect.any(String),
          duration: 5,
        }),
        expect.any(Object)
      );
      expect(mockStorage.uploadFile).toHaveBeenCalled();
    });

    it('should handle generation failure', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'gen-123' },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'failed' },
      });

      await expect(provider.generate(mockParams)).rejects.toThrow(
        'RunwayML video generation failed'
      );
    });

    it('should handle timeout', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'gen-123' },
      });

      // Mock multiple processing statuses (timeout scenario)
      for (let i = 0; i < 60; i++) {
        mockedAxios.get.mockResolvedValueOnce({
          data: { status: 'processing' },
        });
      }

      await expect(provider.generate(mockParams)).rejects.toThrow(
        'RunwayML video generation timed out'
      );
    });

    it('should create appropriate prompt from story content', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { id: 'gen-123' },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'completed', output: ['https://example.com/video.mp4'] },
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from('mock video'),
      });

      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/video.mp4',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      await provider.generate(mockParams);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          prompt: expect.stringContaining('calming'),
        }),
        expect.any(Object)
      );
    });
  });
});

