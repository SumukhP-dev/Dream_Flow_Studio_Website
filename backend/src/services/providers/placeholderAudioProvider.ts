import { AudioProvider, AudioGenerationParams, AudioGenerationResult } from './audioProvider';
import { logger } from '../../utils/logger';

/**
 * Placeholder Audio Provider
 * Used when no audio API is configured or for development/testing
 */
export class PlaceholderAudioProvider implements AudioProvider {
  getName(): string {
    return 'placeholder';
  }

  async generate(params: AudioGenerationParams): Promise<AudioGenerationResult> {
    logger.warn(`Using placeholder audio provider for story ${params.storyId} - no real audio will be generated`);
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return placeholder URL
    return {
      audioUrl: `https://storage.example.com/audio/${params.storyId}.mp3`,
      duration: 60,
      cost: 0,
    };
  }
}

