import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { prismaClient as prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// Initialize Redis connection (optional - will use in-memory fallback if not available)
let redisConnection: Redis | null = null;
let mediaQueue: Queue | null = null;
let mediaWorker: Worker | null = null;

try {
  redisConnection = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis connection failed after 3 retries, media generation will be disabled');
        return null; // Stop retrying
      }
      return Math.min(times * 50, 2000);
    },
    lazyConnect: true,
  });

  redisConnection.on('error', (error) => {
    logger.warn('Redis connection error, media generation may be unavailable', { error });
  });

  redisConnection.on('connect', () => {
    logger.info('Redis connected for media generation queue');
  });

  // Media generation queue
  mediaQueue = new Queue('media-generation', {
    connection: redisConnection,
  });
} catch (error) {
  logger.warn('Failed to initialize Redis, media generation will be disabled', { error });
}

// Export mediaQueue for admin monitoring
export { mediaQueue };

export type MediaType = 'video' | 'audio';
export type MediaStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MediaGenerationJob {
  storyId: string;
  type: MediaType;
  content: string;
  title: string;
  theme?: string;
}

/**
 * Queue media generation job
 */
export async function queueMediaGeneration(
  storyId: string,
  type: MediaType,
  content: string,
  title: string,
  theme?: string
): Promise<void> {
  if (!mediaQueue) {
    logger.warn('Media queue not available (Redis not connected), skipping media generation');
    // Still update status to pending so UI can show it
    const updateField = type === 'video' ? 'videoUrl' : 'audioUrl';
    await prisma.story.update({
      where: { id: storyId },
      data: {
        [updateField]: 'pending',
      },
    });
    return;
  }

  try {
    await mediaQueue.add(
      `generate-${type}`,
      {
        storyId,
        type,
        content,
        title,
        theme,
      } as MediaGenerationJob,
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    // Update story with pending status
    const updateField = type === 'video' ? 'videoUrl' : 'audioUrl';
    await prisma.story.update({
      where: { id: storyId },
      data: {
        [updateField]: 'pending',
      },
    });

    logger.info(`Queued ${type} generation for story ${storyId}`);
  } catch (error) {
    logger.error(`Failed to queue ${type} generation`, { error, storyId });
    throw error;
  }
}

/**
 * Generate video from story content
 * Uses configured video provider (RunwayML, placeholder, etc.)
 */
async function generateVideo(job: Job<MediaGenerationJob>): Promise<{ url: string; cost: number; provider: string }> {
  const { storyId, content, title, theme } = job.data;

  logger.info(`Starting video generation for story ${storyId}`);

  try {
    const { getVideoProvider } = await import('./providers');
    const provider = getVideoProvider();

    const result = await provider.generate({
      storyId,
      content,
      title,
      theme,
    });

    // Log cost if available
    if (result.cost) {
      logger.info(`Video generation cost: $${result.cost.toFixed(4)} for story ${storyId}`);
    }

    return {
      url: result.videoUrl,
      cost: result.cost || 0,
      provider: provider.getName(),
    };
  } catch (error: any) {
    logger.error('Video generation failed', { error: error.message, storyId });
    throw error;
  }
}

/**
 * Generate audio from story content
 * Uses configured audio provider (OpenAI TTS, ElevenLabs, placeholder, etc.)
 */
async function generateAudio(job: Job<MediaGenerationJob>): Promise<{ url: string; cost: number; provider: string }> {
  const { storyId, content, title, theme } = job.data;

  logger.info(`Starting audio generation for story ${storyId}`);

  try {
    const { getAudioProvider } = await import('./providers');
    const provider = getAudioProvider();

    const result = await provider.generate({
      storyId,
      content,
      title,
      theme,
    });

    // Log cost if available
    if (result.cost) {
      logger.info(`Audio generation cost: $${result.cost.toFixed(4)} for story ${storyId}`);
    }

    return {
      url: result.audioUrl,
      cost: result.cost || 0,
      provider: provider.getName(),
    };
  } catch (error: any) {
    logger.error('Audio generation failed', { error: error.message, storyId });
    throw error;
  }
}

/**
 * Process media generation job
 */
async function processMediaGeneration(job: Job<MediaGenerationJob>): Promise<void> {
  const { storyId, type } = job.data;

  // Get story to access userId
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: { userId: true },
  });

  if (!story) {
    throw new Error(`Story ${storyId} not found`);
  }

  const userId = story.userId;
  let costRecordId: string | null = null;

  try {
    // Create cost tracking record
    const costRecord = await prisma.mediaGenerationCost.create({
      data: {
        userId,
        storyId,
        type,
        provider: 'unknown', // Will be updated after generation
        cost: 0,
        status: 'processing',
      },
    });
    costRecordId = costRecord.id;

    // Update status to processing
    const updateField = type === 'video' ? 'videoUrl' : 'audioUrl';
    await prisma.story.update({
      where: { id: storyId },
      data: {
        [updateField]: 'processing',
      },
    });

    // Generate media based on type
    const result =
      type === 'video'
        ? await generateVideo(job)
        : await generateAudio(job);

    // Update cost record with actual cost and provider
    await prisma.mediaGenerationCost.update({
      where: { id: costRecordId },
      data: {
        cost: result.cost,
        provider: result.provider,
        status: 'completed',
      },
    });

    // Update story with generated media URL
    await prisma.story.update({
      where: { id: storyId },
      data: {
        [updateField]: result.url,
      },
    });

    logger.info(`Successfully generated ${type} for story ${storyId}, cost: $${result.cost.toFixed(4)}`);
  } catch (error) {
    logger.error(`Failed to generate ${type} for story ${storyId}`, { error });

    // Update cost record to failed
    if (costRecordId) {
      await prisma.mediaGenerationCost.update({
        where: { id: costRecordId },
        data: {
          status: 'failed',
        },
      }).catch(err => {
        logger.error('Failed to update cost record status', { error: err });
      });
    }

    // Update status to failed
    const updateField = type === 'video' ? 'videoUrl' : 'audioUrl';
    await prisma.story.update({
      where: { id: storyId },
      data: {
        [updateField]: 'failed',
      },
    });

    throw error;
  }
}

/**
 * Create worker to process media generation jobs
 */
export function createMediaWorker(): Worker | null {
  if (!redisConnection || !mediaQueue) {
    logger.warn('Cannot create media worker: Redis not available');
    return null;
  }

  const worker = new Worker(
    'media-generation',
    async (job: Job<MediaGenerationJob>) => {
      await processMediaGeneration(job);
    },
    {
      connection: redisConnection!,
      concurrency: 2, // Process 2 jobs concurrently
    }
  );

  worker.on('completed', (job) => {
    logger.info(`Media generation job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Media generation job ${job?.id} failed`, { error: err });
  });

  mediaWorker = worker;
  return worker;
}

/**
 * Initialize media generation system
 */
export async function initializeMediaService(): Promise<void> {
  if (!redisConnection) {
    logger.warn('Redis not available, media generation will be disabled');
    return;
  }

  try {
    await redisConnection.connect();
    createMediaWorker();
    logger.info('Media generation service initialized');
  } catch (error) {
    logger.warn('Failed to initialize media generation service', { error });
  }
}

/**
 * Shutdown media generation system
 */
export async function shutdownMediaService(): Promise<void> {
  if (mediaWorker) {
    await mediaWorker.close();
    mediaWorker = null;
  }
  if (mediaQueue) {
    await mediaQueue.close();
    mediaQueue = null;
  }
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

/**
 * Get media generation status
 */
export async function getMediaStatus(
  storyId: string
): Promise<{ video: MediaStatus; audio: MediaStatus }> {
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    select: {
      videoUrl: true,
      audioUrl: true,
    },
  });

  if (!story) {
    throw new Error('Story not found');
  }

  const getStatus = (url: string | null | undefined): MediaStatus => {
    if (!url) return 'pending';
    if (url === 'pending') return 'pending';
    if (url === 'processing') return 'processing';
    if (url === 'failed') return 'failed';
    return 'completed';
  };

  return {
    video: getStatus(story.videoUrl),
    audio: getStatus(story.audioUrl),
  };
}

/**
 * Regenerate media
 */
export async function regenerateMedia(
  storyId: string,
  type: MediaType,
  content: string,
  title: string,
  theme?: string
): Promise<void> {
  await queueMediaGeneration(storyId, type, content, title, theme);
}

