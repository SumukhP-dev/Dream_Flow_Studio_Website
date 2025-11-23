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
});

