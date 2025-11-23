import axios from 'axios';
import { VideoProvider, VideoGenerationParams, VideoGenerationResult } from './videoProvider';
import { logger } from '../../utils/logger';
import { getStorageService } from '../storageService';

/**
 * RunwayML Video Generation Provider
 * Documentation: https://docs.runwayml.com/
 */
export class RunwayVideoProvider implements VideoProvider {
  private apiKey: string;
  private apiUrl: string = 'https://api.runwayml.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RUNWAY_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('RunwayML API key not configured');
    }
  }

  getName(): string {
    return 'runwayml';
  }

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    if (!this.apiKey) {
      throw new Error('RunwayML API key not configured');
    }

    try {
      logger.info(`Starting RunwayML video generation for story ${params.storyId}`);

      // Create a prompt from the story content
      const prompt = this.createPrompt(params);

      // Call RunwayML API to generate video
      // Note: This is a simplified example - actual API may vary
      const response = await axios.post(
        `${this.apiUrl}/generations`,
        {
          model: 'gen2',
          prompt: prompt,
          duration: 5, // 5 seconds for story videos
          aspectRatio: '16:9',
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 minutes timeout
        }
      );

      const generationId = response.data.id;
      
      // Poll for completion
      let videoUrl: string | null = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5s intervals)

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await axios.get(
          `${this.apiUrl}/generations/${generationId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        const status = statusResponse.data.status;
        
        if (status === 'completed') {
          videoUrl = statusResponse.data.output[0];
          break;
        } else if (status === 'failed') {
          throw new Error('RunwayML video generation failed');
        }

        attempts++;
      }

      if (!videoUrl) {
        throw new Error('RunwayML video generation timed out');
      }

      // Download video and upload to our storage
      const videoResponse = await axios.get(videoUrl, { responseType: 'arraybuffer' });
      const videoBuffer = Buffer.from(videoResponse.data);

      const storage = getStorageService();
      const uploadResult = await storage.uploadFile(
        videoBuffer,
        `${params.storyId}.mp4`,
        'video/mp4',
        'system' // System user for generated media
      );

      logger.info(`RunwayML video generation completed for story ${params.storyId}`);

      return {
        videoUrl: uploadResult.url,
        duration: 5, // Estimated duration
        cost: 0.05 * 5, // Approximate cost calculation
      };
    } catch (error: any) {
      logger.error('RunwayML video generation failed', { error: error.message, storyId: params.storyId });
      throw new Error(`RunwayML video generation failed: ${error.message}`);
    }
  }

  private createPrompt(params: VideoGenerationParams): string {
    // Create a visual prompt from story content
    const theme = params.theme || 'calming';
    const contentPreview = params.content.substring(0, 500).replace(/<[^>]+>/g, '');
    
    return `A ${theme} themed video scene: ${contentPreview}. Calming, peaceful, sleep-inducing visuals with soft lighting and gentle movement.`;
  }
}

