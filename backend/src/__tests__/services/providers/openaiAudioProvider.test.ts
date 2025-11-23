import { OpenAIAudioProvider } from '../../../services/providers/openaiAudioProvider';
import { getStorageService } from '../../../services/storageService';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    audio: {
      speech: {
        create: jest.fn(),
      },
    },
  }));
});

jest.mock('../../../services/storageService');

const mockedGetStorageService = getStorageService as jest.MockedFunction<typeof getStorageService>;

describe('OpenAIAudioProvider', () => {
  let provider: OpenAIAudioProvider;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = mockApiKey;
    provider = new OpenAIAudioProvider();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('getName', () => {
    it('should return provider name', () => {
      expect(provider.getName()).toBe('openai');
    });
  });

  describe('generate', () => {
    const mockParams = {
      storyId: 'test-story-id',
      content: 'This is a short test story content.',
      title: 'Test Story',
      theme: 'calming',
    };

    it('should throw error if API key not configured', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => new OpenAIAudioProvider()).toThrow(
        'OpenAI API key not configured'
      );
    });

    it('should generate audio successfully', async () => {
      const mockAudioBuffer = Buffer.from('mock audio data');
      const mockArrayBuffer = mockAudioBuffer.buffer;

      // Mock OpenAI client
      const mockOpenAIClient = (provider as any).client;
      mockOpenAIClient.audio.speech.create.mockResolvedValueOnce({
        arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
      });

      // Mock storage service
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
      expect(mockOpenAIClient.audio.speech.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'tts-1',
          input: expect.stringContaining('test story'),
        })
      );
      expect(mockStorage.uploadFile).toHaveBeenCalled();
    });

    it('should split long content into chunks', async () => {
      const longContent = 'A'.repeat(5000); // Exceeds 4000 char limit
      const mockAudioBuffer = Buffer.from('mock audio');

      const mockOpenAIClient = (provider as any).client;
      // Should be called multiple times for chunks
      mockOpenAIClient.audio.speech.create
        .mockResolvedValueOnce({
          arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
        })
        .mockResolvedValueOnce({
          arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
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

      expect(mockOpenAIClient.audio.speech.create).toHaveBeenCalledTimes(2);
    });

    it('should handle HTML content by removing tags', async () => {
      const htmlContent = '<p>This is <strong>test</strong> content</p>';
      const mockAudioBuffer = Buffer.from('mock audio');

      const mockOpenAIClient = (provider as any).client;
      mockOpenAIClient.audio.speech.create.mockResolvedValueOnce({
        arrayBuffer: jest.fn().mockResolvedValue(mockAudioBuffer.buffer),
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

      const callArgs = mockOpenAIClient.audio.speech.create.mock.calls[0][0];
      expect(callArgs.input).not.toContain('<p>');
      expect(callArgs.input).not.toContain('<strong>');
    });
  });
});

