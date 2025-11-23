import { generateStory, setOpenAIClient } from '../../services/storyService';
import OpenAI from 'openai';

describe('Story Service', () => {
  let mockChatCompletionsCreate: jest.Mock;
  let mockOpenAIClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    // Create mock OpenAI client
    mockChatCompletionsCreate = jest.fn();
    mockOpenAIClient = {
      chat: {
        completions: {
          create: mockChatCompletionsCreate,
        },
      },
    };
    
    // Inject mock client
    setOpenAIClient(mockOpenAIClient as any);
  });

  it('should generate a story with valid parameters', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Test Story Title\n\nThis is the story content.',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);
    
    const result = await generateStory({
      prompt: 'A calming story',
      theme: 'nature',
    });

    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('content');
    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo-preview',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
      })
    );
  });

  it('should handle OpenAI API errors', async () => {
    mockChatCompletionsCreate.mockRejectedValue(new Error('API Error'));

    await expect(
      generateStory({
        prompt: 'A story',
      })
    ).rejects.toThrow('Failed to generate story');
  });

  it('should extract title from content', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'The Enchanted Forest\n\nOnce upon a time...',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    const result = await generateStory({
      prompt: 'A story',
    });

    expect(result.title).toBe('The Enchanted Forest');
  });

  it('should extract title from first sentence if no title line', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Once upon a time in a magical forest. There lived...',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    const result = await generateStory({
      prompt: 'A story',
    });

    expect(result.title).toBe('Once upon a time in a magical forest');
  });

  it('should use default title when extraction fails', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'This is a very long first line that exceeds the title length limit and should not be used as a title because it is too long to be a proper title for a story.',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    const result = await generateStory({
      prompt: 'A story',
    });

    expect(result.title).toBe('Untitled Story');
  });

  it('should handle empty content from OpenAI', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: '',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    const result = await generateStory({
      prompt: 'A story',
    });

    expect(result.title).toBe('Untitled Story');
    expect(result.content).toBe('');
  });

  it('should include theme in user prompt when provided', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Test Story',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    await generateStory({
      prompt: 'A calming story',
      theme: 'nature',
    });

    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('nature'),
          }),
        ]),
      })
    );
  });

  it('should include parameters in generation', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Test Story',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    const result = await generateStory({
      prompt: 'A story',
      theme: 'fantasy',
      parameters: { length: 'long', tone: 'mysterious' },
    });

    expect(mockChatCompletionsCreate).toHaveBeenCalled();
    expect(result.content).toBeDefined();
  });

  it('should handle OpenAI API rate limit errors', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as any).status = 429;
    mockChatCompletionsCreate.mockRejectedValue(rateLimitError);

    await expect(
      generateStory({
        prompt: 'A story',
      })
    ).rejects.toThrow('Failed to generate story');
  });

  it('should use correct model and temperature settings', async () => {
    const mockCompletion = {
      choices: [
        {
          message: {
            content: 'Test Story',
          },
        },
      ],
    };

    mockChatCompletionsCreate.mockResolvedValue(mockCompletion);

    await generateStory({
      prompt: 'A story',
    });

    expect(mockChatCompletionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4-turbo-preview',
        temperature: 0.8,
        max_tokens: 2000,
      })
    );
  });
});

