import { createStorageService, StorageConfig } from '../../services/storageService';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

// Mock Supabase
jest.mock('@supabase/supabase-js');

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
  }));
});

describe('Storage Service', () => {
  describe('S3StorageService', () => {
    let mockS3Client: jest.Mocked<S3Client>;
    let mockSend: jest.Mock;
    let mockGetSignedUrl: jest.Mock;

    beforeEach(() => {
      jest.clearAllMocks();
      mockSend = jest.fn();
      mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/signed-url');
      
      (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => {
        return {
          send: mockSend,
        } as any;
      });

      (getSignedUrl as jest.Mock).mockImplementation(mockGetSignedUrl);
    });

    it('should create S3 storage service with valid config', () => {
      const config: StorageConfig = {
        provider: 's3',
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      expect(() => createStorageService(config)).not.toThrow();
    });

    it('should throw error if S3 config is missing', () => {
      const config: StorageConfig = {
        provider: 's3',
      };

      expect(() => createStorageService(config)).toThrow('S3 configuration is required');
    });

    it('should upload file to S3', async () => {
      const config: StorageConfig = {
        provider: 's3',
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      const service = createStorageService(config);
      mockSend.mockResolvedValueOnce({}); // PutObjectCommand response
      mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/file-url');
      mockGetSignedUrl.mockResolvedValueOnce('https://s3.example.com/thumbnail-url');

      const result = await service.uploadFile(
        Buffer.from('test file content'),
        'test.jpg',
        'image/jpeg',
        'user-id'
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(mockSend).toHaveBeenCalled();
    });

    it('should generate thumbnail for images', async () => {
      const config: StorageConfig = {
        provider: 's3',
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      const service = createStorageService(config);
      mockSend.mockResolvedValue({});
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/url');

      const result = await service.uploadFile(
        Buffer.from('image content'),
        'test.jpg',
        'image/jpeg',
        'user-id'
      );

      // Should have called send twice (file + thumbnail)
      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result.thumbnailUrl).toBeDefined();
    });

    it('should get file URL with expiry', async () => {
      const config: StorageConfig = {
        provider: 's3',
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      const service = createStorageService(config);
      mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed-url');

      const url = await service.getFileUrl('test-key', 3600);

      expect(url).toBe('https://s3.example.com/signed-url');
      expect(mockGetSignedUrl).toHaveBeenCalled();
      // Check that it was called with correct expiresIn
      const callArgs = (mockGetSignedUrl as jest.Mock).mock.calls[0];
      expect(callArgs[2]).toEqual({ expiresIn: 3600 });
    });

    it('should delete file from S3', async () => {
      const config: StorageConfig = {
        provider: 's3',
        s3: {
          region: 'us-east-1',
          bucket: 'test-bucket',
          accessKeyId: 'test-key',
          secretAccessKey: 'test-secret',
        },
      };

      const service = createStorageService(config);
      mockSend.mockResolvedValue({});

      await service.deleteFile('test-key');

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('SupabaseStorageService', () => {
    let mockSupabaseClient: any;
    let mockBucket: any;

    beforeEach(() => {
      jest.clearAllMocks();
      mockBucket = {
        upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.example.com/file' } }),
        remove: jest.fn().mockResolvedValue({ error: null }),
      };
      
      mockSupabaseClient = {
        storage: {
          from: jest.fn(() => mockBucket),
        },
      };

      (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    });

    it('should create Supabase storage service with valid config', () => {
      const config: StorageConfig = {
        provider: 'supabase',
        supabase: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          bucket: 'test-bucket',
        },
      };

      expect(() => createStorageService(config)).not.toThrow();
    });

    it('should throw error if Supabase config is missing', () => {
      const config: StorageConfig = {
        provider: 'supabase',
      };

      expect(() => createStorageService(config)).toThrow('Supabase configuration is required');
    });

    it('should upload file to Supabase', async () => {
      const config: StorageConfig = {
        provider: 'supabase',
        supabase: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          bucket: 'test-bucket',
        },
      };

      const service = createStorageService(config);

      const result = await service.uploadFile(
        Buffer.from('test file content'),
        'test.jpg',
        'image/jpeg',
        'user-id'
      );

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.upload).toHaveBeenCalled();
    });

    it('should get public URL from Supabase', async () => {
      const config: StorageConfig = {
        provider: 'supabase',
        supabase: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          bucket: 'test-bucket',
        },
      };

      const service = createStorageService(config);

      const url = await service.getFileUrl('test-key');

      expect(url).toBe('https://supabase.example.com/file');
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.getPublicUrl).toHaveBeenCalledWith('test-key');
    });

    it('should delete file from Supabase', async () => {
      const config: StorageConfig = {
        provider: 'supabase',
        supabase: {
          url: 'https://test.supabase.co',
          key: 'test-key',
          bucket: 'test-bucket',
        },
      };

      const service = createStorageService(config);

      await service.deleteFile('test-key');

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.remove).toHaveBeenCalledWith(['test-key']);
    });
  });

  describe('getStorageService', () => {
    beforeEach(() => {
      // Reset environment variables
      delete process.env.STORAGE_PROVIDER;
      delete process.env.AWS_S3_BUCKET;
      delete process.env.SUPABASE_URL;
    });

    it('should default to Supabase when no provider is set', () => {
      process.env.SUPABASE_URL = 'https://test.supabase.co';
      process.env.SUPABASE_SERVICE_KEY = 'test-key';
      process.env.SUPABASE_STORAGE_BUCKET = 'test-bucket';

      const { getStorageService } = require('../../services/storageService');
      
      // Should not throw
      expect(() => getStorageService()).not.toThrow();
    });

    it('should use S3 when STORAGE_PROVIDER is set to s3', () => {
      process.env.STORAGE_PROVIDER = 's3';
      process.env.AWS_S3_BUCKET = 'test-bucket';
      process.env.AWS_REGION = 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

      const { getStorageService } = require('../../services/storageService');
      
      // Should not throw
      expect(() => getStorageService()).not.toThrow();
    });
  });
});

