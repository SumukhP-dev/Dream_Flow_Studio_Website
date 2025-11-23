/**
 * Audio Generation Provider Interface
 * Allows switching between different TTS APIs
 */

export interface AudioGenerationParams {
  storyId: string;
  content: string;
  title: string;
  theme?: string;
  voice?: string;
  speed?: number;
}

export interface AudioGenerationResult {
  audioUrl: string;
  duration?: number;
  cost?: number;
}

export interface AudioProvider {
  generate(params: AudioGenerationParams): Promise<AudioGenerationResult>;
  getName(): string;
}

