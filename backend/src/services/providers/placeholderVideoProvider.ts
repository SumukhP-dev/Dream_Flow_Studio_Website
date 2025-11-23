import { VideoProvider, VideoGenerationParams, VideoGenerationResult } from './videoProvider';
import { logger } from '../../utils/logger';

/**
 * Placeholder Video Provider
 * Used when no video API is configured or for development/testing
 */
export class PlaceholderVideoProvider implements VideoProvider {
  getName(): string {
    return 'placeholder';
  }

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    logger.warn(`Using placeholder video provider for story ${params.storyId} - no real video will be generated`);
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Return placeholder URL
    return {
      videoUrl: `https://storage.example.com/videos/${params.storyId}.mp4`,
      duration: 5,
      cost: 0,
    };
  }
}

