import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { logError, logInfo } from '../utils/logger';

export type StorageProvider = 's3' | 'supabase' | 'local';

export interface StorageConfig {
  provider: StorageProvider;
  s3?: {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  supabase?: {
    url: string;
    key: string;
    bucket: string;
  };
  local?: {
    uploadPath: string;
  };
}

export interface UploadResult {
  url: string;
  key: string;
  thumbnailUrl?: string;
}

export interface StorageService {
  uploadFile(
    file: Buffer,
    filename: string,
    mimetype: string,
    userId: string
  ): Promise<UploadResult>;
  getFileUrl(key: string, expiresIn?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
  generateThumbnail(file: Buffer, mimetype: string): Promise<Buffer>;
}

class S3StorageService implements StorageService {
  private client: S3Client;
  private bucket: string;

  constructor(config: NonNullable<StorageConfig['s3']>) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimetype: string,
    userId: string
  ): Promise<UploadResult> {
    const key = `${userId}/${uuidv4()}-${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: mimetype,
        Metadata: {
          userId,
          originalFilename: filename,
        },
      });

      await this.client.send(command);

      const url = await this.getFileUrl(key);

      // Generate thumbnail for images
      let thumbnailUrl: string | undefined;
      if (mimetype.startsWith('image/')) {
        try {
          const thumbnail = await this.generateThumbnail(file, mimetype);
          const thumbnailKey = `${key}-thumbnail`;
          const thumbnailCommand = new PutObjectCommand({
            Bucket: this.bucket,
            Key: thumbnailKey,
            Body: thumbnail,
            ContentType: 'image/jpeg',
          });
          await this.client.send(thumbnailCommand);
          thumbnailUrl = await this.getFileUrl(thumbnailKey);
        } catch (error) {
          logError('Failed to generate thumbnail', error);
        }
      }

      return { url, key, thumbnailUrl };
    } catch (error) {
      logError('S3 upload failed', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      logError('S3 delete failed', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  async generateThumbnail(file: Buffer, mimetype: string): Promise<Buffer> {
    return await sharp(file)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}

class SupabaseStorageService implements StorageService {
  private client: any;
  private bucket: string;

  constructor(config: NonNullable<StorageConfig['supabase']>) {
    this.client = createClient(config.url, config.key);
    this.bucket = config.bucket;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimetype: string,
    userId: string
  ): Promise<UploadResult> {
    const key = `${userId}/${uuidv4()}-${filename}`;

    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .upload(key, file, {
          contentType: mimetype,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = this.client.storage
        .from(this.bucket)
        .getPublicUrl(key);

      let thumbnailUrl: string | undefined;
      if (mimetype.startsWith('image/')) {
        try {
          const thumbnail = await this.generateThumbnail(file, mimetype);
          const thumbnailKey = `${key}-thumbnail`;
          const { error: thumbError } = await this.client.storage
            .from(this.bucket)
            .upload(thumbnailKey, thumbnail, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (!thumbError) {
            const { data: thumbUrlData } = this.client.storage
              .from(this.bucket)
              .getPublicUrl(thumbnailKey);
            thumbnailUrl = thumbUrlData.publicUrl;
          }
        } catch (error) {
          logError('Failed to generate thumbnail', error);
        }
      }

      return {
        url: urlData.publicUrl,
        key,
        thumbnailUrl,
      };
    } catch (error) {
      logError('Supabase upload failed', error);
      throw new Error('Failed to upload file to Supabase');
    }
  }

  async getFileUrl(key: string): Promise<string> {
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove([key]);
      if (error) throw error;
    } catch (error) {
      logError('Supabase delete failed', error);
      throw new Error('Failed to delete file from Supabase');
    }
  }

  async generateThumbnail(file: Buffer, mimetype: string): Promise<Buffer> {
    return await sharp(file)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
}

// Factory function to create storage service
export function createStorageService(config: StorageConfig): StorageService {
  switch (config.provider) {
    case 's3':
      if (!config.s3) {
        throw new Error('S3 configuration is required');
      }
      return new S3StorageService(config.s3);
    case 'supabase':
      if (!config.supabase) {
        throw new Error('Supabase configuration is required');
      }
      return new SupabaseStorageService(config.supabase);
    default:
      throw new Error(`Unsupported storage provider: ${config.provider}`);
  }
}

// Get storage service from environment
export function getStorageService(): StorageService {
  const provider = (process.env.STORAGE_PROVIDER || 'supabase') as StorageProvider;

  const config: StorageConfig = {
    provider,
    s3: process.env.AWS_S3_BUCKET
      ? {
          region: process.env.AWS_REGION || 'us-east-1',
          bucket: process.env.AWS_S3_BUCKET,
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        }
      : undefined,
    supabase: process.env.SUPABASE_URL
      ? {
          url: process.env.SUPABASE_URL,
          key: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
          bucket: process.env.SUPABASE_STORAGE_BUCKET || 'assets',
        }
      : undefined,
  };

  return createStorageService(config);
}

