/**
 * Video Generation Provider Interface
 * Allows switching between different video generation APIs
 */

export interface VideoGenerationParams {
  storyId: string;
  content: string;
  title: string;
  theme?: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  duration?: number;
  cost?: number;
}

export interface VideoProvider {
  generate(params: VideoGenerationParams): Promise<VideoGenerationResult>;
  getName(): string;
}

