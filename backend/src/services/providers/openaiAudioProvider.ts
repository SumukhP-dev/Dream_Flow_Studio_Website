import OpenAI from 'openai';
import { AudioProvider, AudioGenerationParams, AudioGenerationResult } from './audioProvider';
import { logger } from '../../utils/logger';
import { getStorageService } from '../storageService';

/**
 * OpenAI TTS Audio Generation Provider
 * Uses OpenAI's text-to-speech API
 */
export class OpenAIAudioProvider implements AudioProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key not configured');
    }
    this.client = new OpenAI({ apiKey: key });
  }

  getName(): string {
    return 'openai';
  }

  async generate(params: AudioGenerationParams): Promise<AudioGenerationResult> {
    try {
      logger.info(`Starting OpenAI TTS audio generation for story ${params.storyId}`);

      // Clean content from HTML tags
      const cleanContent = params.content.replace(/<[^>]+>/g, '').trim();
      
      // Split into chunks if too long (OpenAI TTS has limits)
      const maxChunkLength = 4000; // Characters
      const chunks = this.splitIntoChunks(cleanContent, maxChunkLength);

      // Generate audio for each chunk
      const audioBuffers: Buffer[] = [];
      let totalCost = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const response = await this.client.audio.speech.create({
          model: 'tts-1', // or 'tts-1-hd' for higher quality
          voice: (params.voice as any) || 'nova', // 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
          input: chunk,
          speed: params.speed || 1.0,
        });

        const audioBuffer = Buffer.from(await response.arrayBuffer());
        audioBuffers.push(audioBuffer);

        // Calculate cost (approximate: $15 per 1M characters for tts-1)
        totalCost += (chunk.length / 1000000) * 15;
      }

      // Combine audio chunks
      const combinedAudio = Buffer.concat(audioBuffers);

      // Upload to storage
      const storage = getStorageService();
      const uploadResult = await storage.uploadFile(
        combinedAudio,
        `${params.storyId}.mp3`,
        'audio/mpeg',
        'system' // System user for generated media
      );

      // Estimate duration (assuming ~150 words per minute, ~5 characters per word)
      const wordCount = cleanContent.split(/\s+/).length;
      const estimatedDuration = Math.ceil((wordCount / 150) * 60); // seconds

      logger.info(`OpenAI TTS audio generation completed for story ${params.storyId}`);

      return {
        audioUrl: uploadResult.url,
        duration: estimatedDuration,
        cost: totalCost,
      };
    } catch (error: any) {
      logger.error('OpenAI TTS audio generation failed', { error: error.message, storyId: params.storyId });
      throw new Error(`OpenAI TTS audio generation failed: ${error.message}`);
    }
  }

  private splitIntoChunks(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxLength) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}

