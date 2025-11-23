import { ElevenLabsAudioProvider } from '../../../services/providers/elevenLabsAudioProvider';
import axios from 'axios';
import { getStorageService } from '../../../services/storageService';

jest.mock('axios');
jest.mock('../../../services/storageService');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetStorageService = getStorageService as jest.MockedFunction<typeof getStorageService>;

describe('ElevenLabsAudioProvider', () => {
  let provider: ElevenLabsAudioProvider;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = mockApiKey;
    provider = new ElevenLabsAudioProvider();
  });

  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('elevenlabs');
    });
  });

  describe('generate', () => {
    const mockParams = {
      storyId: 'test-story-id',
      content: 'This is a test story content.',
      title: 'Test Story',
      theme: 'calming',
    };

    it('should throw error if API key not configured', async () => {
      const providerWithoutKey = new ElevenLabsAudioProvider('');
      
      await expect(providerWithoutKey.generate(mockParams)).rejects.toThrow(
        'ElevenLabs API key not configured'
      );
    });

    it('should generate audio successfully', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');

      mockedAxios.post.mockResolvedValueOnce({
        data: mockAudioBuffer,
      });

      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/audio.mp3',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      const result = await provider.generate(mockParams);

      expect(result.audioUrl).toBe('https://storage.example.com/audio.mp3');
      expect(result.duration).toBeGreaterThan(0);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/text-to-speech/'),
        expect.objectContaining({
          text: expect.stringContaining('test story'),
          model_id: 'eleven_monolingual_v1',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'xi-api-key': mockApiKey,
          }),
        })
      );
      expect(mockStorage.uploadFile).toHaveBeenCalled();
    });

    it('should use custom voice if provided', async () => {
      const mockAudioBuffer = Buffer.from('mock audio');
      mockedAxios.post.mockResolvedValueOnce({
        data: mockAudioBuffer,
      });

      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/audio.mp3',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      await provider.generate({
        ...mockParams,
        voice: 'custom-voice-id',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/text-to-speech/custom-voice-id'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should split long content into chunks', async () => {
      const longContent = 'A'.repeat(6000); // Exceeds 5000 char limit
      const mockAudioBuffer = Buffer.from('mock audio');

      mockedAxios.post
        .mockResolvedValueOnce({
          data: mockAudioBuffer,
        })
        .mockResolvedValueOnce({
          data: mockAudioBuffer,
        });

      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/audio.mp3',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      await provider.generate({
        ...mockParams,
        content: longContent,
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle HTML content by removing tags', async () => {
      const htmlContent = '<p>This is <em>test</em> content</p>';
      const mockAudioBuffer = Buffer.from('mock audio');

      mockedAxios.post.mockResolvedValueOnce({
        data: mockAudioBuffer,
      });

      const mockStorage = {
        uploadFile: jest.fn().mockResolvedValue({
          url: 'https://storage.example.com/audio.mp3',
          key: 'test-key',
        }),
      };
      mockedGetStorageService.mockReturnValue(mockStorage as any);

      await provider.generate({
        ...mockParams,
        content: htmlContent,
      });

      const callArgs = mockedAxios.post.mock.calls[0][1];
      expect(callArgs.text).not.toContain('<p>');
      expect(callArgs.text).not.toContain('<em>');
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        message: 'API Error',
        response: { status: 429 },
      });

      await expect(provider.generate(mockParams)).rejects.toThrow(
        'ElevenLabs audio generation failed'
      );
    });
  });
});

