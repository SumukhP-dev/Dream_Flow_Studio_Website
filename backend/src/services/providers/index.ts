/**
 * Media Provider Factory
 * Creates and manages video/audio generation providers
 */

import { VideoProvider } from './videoProvider';
import { AudioProvider } from './audioProvider';
import { RunwayVideoProvider } from './runwayVideoProvider';
import { PlaceholderVideoProvider } from './placeholderVideoProvider';
import { OpenAIAudioProvider } from './openaiAudioProvider';
import { ElevenLabsAudioProvider } from './elevenLabsAudioProvider';
import { PlaceholderAudioProvider } from './placeholderAudioProvider';
import { logger } from '../../utils/logger';

let videoProvider: VideoProvider | null = null;
let audioProvider: AudioProvider | null = null;

/**
 * Get video generation provider
 */
export function getVideoProvider(): VideoProvider {
  if (videoProvider) {
    return videoProvider;
  }

  const providerName = process.env.VIDEO_PROVIDER || 'placeholder';

  switch (providerName.toLowerCase()) {
    case 'runwayml':
    case 'runway':
      if (process.env.RUNWAY_API_KEY) {
        videoProvider = new RunwayVideoProvider();
        logger.info('Using RunwayML video provider');
      } else {
        logger.warn('RunwayML API key not found, using placeholder');
        videoProvider = new PlaceholderVideoProvider();
      }
      break;
    default:
      videoProvider = new PlaceholderVideoProvider();
      logger.info('Using placeholder video provider');
  }

  return videoProvider;
}

/**
 * Get audio generation provider
 */
export function getAudioProvider(): AudioProvider {
  if (audioProvider) {
    return audioProvider;
  }

  const providerName = process.env.AUDIO_PROVIDER || 'openai';

  switch (providerName.toLowerCase()) {
    case 'openai':
      try {
        audioProvider = new OpenAIAudioProvider();
        logger.info('Using OpenAI TTS audio provider');
      } catch (error) {
        logger.warn('OpenAI API key not found, using placeholder');
        audioProvider = new PlaceholderAudioProvider();
      }
      break;
    case 'elevenlabs':
    case 'eleven':
      if (process.env.ELEVENLABS_API_KEY) {
        audioProvider = new ElevenLabsAudioProvider();
        logger.info('Using ElevenLabs audio provider');
      } else {
        logger.warn('ElevenLabs API key not found, using placeholder');
        audioProvider = new PlaceholderAudioProvider();
      }
      break;
    default:
      audioProvider = new PlaceholderAudioProvider();
      logger.info('Using placeholder audio provider');
  }

  return audioProvider;
}

/**
 * Reset providers (useful for testing)
 */
export function resetProviders(): void {
  videoProvider = null;
  audioProvider = null;
}

