import axios from 'axios';
import { AudioProvider, AudioGenerationParams, AudioGenerationResult } from './audioProvider';
import { logger } from '../../utils/logger';
import { getStorageService } from '../storageService';

/**
 * ElevenLabs Audio Generation Provider
 * Documentation: https://elevenlabs.io/docs
 */
export class ElevenLabsAudioProvider implements AudioProvider {
  private apiKey: string;
  private apiUrl: string = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId: string = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('ElevenLabs API key not configured');
    }
  }

  getName(): string {
    return 'elevenlabs';
  }

  async generate(params: AudioGenerationParams): Promise<AudioGenerationResult> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      logger.info(`Starting ElevenLabs audio generation for story ${params.storyId}`);

      // Clean content from HTML tags
      const cleanContent = params.content.replace(/<[^>]+>/g, '').trim();
      
      // ElevenLabs has character limits, so we may need to split
      const maxChunkLength = 5000; // Characters per request
      const chunks = this.splitIntoChunks(cleanContent, maxChunkLength);

      // Generate audio for each chunk
      const audioBuffers: Buffer[] = [];
      let totalCost = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const voiceId = params.voice || this.defaultVoiceId;
        const speed = params.speed || 1.0;

        const response = await axios.post(
          `${this.apiUrl}/text-to-speech/${voiceId}`,
          {
            text: chunk,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true,
            },
            speed: speed,
          },
          {
            headers: {
              'Accept': 'audio/mpeg',
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 120000, // 2 minutes timeout
          }
        );

        const audioBuffer = Buffer.from(response.data);
        audioBuffers.push(audioBuffer);

        // Calculate cost (approximate: $0.30 per 1000 characters for standard plan)
        totalCost += (chunk.length / 1000) * 0.30;
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

      logger.info(`ElevenLabs audio generation completed for story ${params.storyId}`);

      return {
        audioUrl: uploadResult.url,
        duration: estimatedDuration,
        cost: totalCost,
      };
    } catch (error: any) {
      logger.error('ElevenLabs audio generation failed', { error: error.message, storyId: params.storyId });
      throw new Error(`ElevenLabs audio generation failed: ${error.message}`);
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

