import request from 'supertest';
import app from '../../server';
import { PrismaClient } from '@prisma/client';
import {
  createTestUser,
  createTestAsset,
  generateTestToken,
  cleanupTestData,
} from '../helpers/testHelpers';
import { getStorageService } from '../../services/storageService';

const hasDatabase = !!(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

// Mock storage service
jest.mock('../../services/storageService', () => ({
  getStorageService: jest.fn(() => ({
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://example.com/test-file',
      key: 'test-key',
      thumbnailUrl: 'https://example.com/test-thumbnail',
    }),
    getFileUrl: jest.fn().mockResolvedValue('https://example.com/signed-url'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    generateThumbnail: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
  })),
}));

function getPrismaClient(): PrismaClient {
  if (!hasDatabase) {
    throw new Error('DATABASE_URL or TEST_DATABASE_URL must be set for database tests');
  }
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });
}

describe('Assets Routes', () => {
  let testUser: any;
  let authToken: string;

  beforeAll(() => {
    if (!hasDatabase) {
      console.warn('Skipping database tests: DATABASE_URL not set');
    }
  });

  beforeEach(async () => {
    if (hasDatabase) {
      await cleanupTestData();
      testUser = await createTestUser();
      authToken = generateTestToken(testUser.id, testUser.email);
    } else {
      testUser = { id: 'test-user-id', email: 'test@example.com' };
      authToken = generateTestToken(testUser.id, testUser.email);
    }
  });

  describe('GET /api/v1/assets', () => {
    beforeEach(async () => {
      if (hasDatabase) {
        await createTestAsset(testUser.id, 'video', { name: 'video1.mp4' });
        await createTestAsset(testUser.id, 'audio', { name: 'audio1.mp3' });
        await createTestAsset(testUser.id, 'image', { name: 'image1.jpg' });
      }
    });

    (hasDatabase ? it : it.skip)('should get all assets for user', async () => {
      const response = await request(app)
        .get('/api/v1/assets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.assets).toHaveLength(3);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination.total).toBe(3);
    });

    (hasDatabase ? it : it.skip)('should filter assets by type', async () => {
      const response = await request(app)
        .get('/api/v1/assets?type=video')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assets).toHaveLength(1);
      expect(response.body.assets[0].type).toBe('video');
    });

    (hasDatabase ? it : it.skip)('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/assets?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.assets.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get('/api/v1/assets');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/assets/upload', () => {
    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/v1/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('type', 'image');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('No file provided');
    });

    it('should reject upload without type', async () => {
      const response = await request(app)
        .post('/api/v1/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(400);
    });

    it('should reject upload with invalid type', async () => {
      const response = await request(app)
        .post('/api/v1/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('type', 'invalid')
        .attach('file', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('Invalid asset type');
    });

    it('should reject upload with invalid file type', async () => {
      const response = await request(app)
        .post('/api/v1/assets/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('type', 'image')
        .attach('file', Buffer.from('test'), 'test.pdf');

      expect(response.status).toBe(400);
    });

    it('should reject without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/assets/upload')
        .field('type', 'image')
        .attach('file', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/assets/video/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const asset = await createTestAsset(testUser.id, 'video', {
          name: 'test-video.mp4',
          url: 'test-video-key',
        });
        assetId = asset.id;
      } else {
        assetId = 'test-asset-id';
      }
    });

    (hasDatabase ? it : it.skip)('should get video URL', async () => {
      const response = await request(app)
        .get(`/api/v1/assets/video/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should reject getting non-existent video', async () => {
      const response = await request(app)
        .get('/api/v1/assets/video/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/v1/assets/video/${assetId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/assets/audio/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const asset = await createTestAsset(testUser.id, 'audio', {
          name: 'test-audio.mp3',
          url: 'test-audio-key',
        });
        assetId = asset.id;
      } else {
        assetId = 'test-asset-id';
      }
    });

    (hasDatabase ? it : it.skip)('should get audio URL', async () => {
      const response = await request(app)
        .get(`/api/v1/assets/audio/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.url).toBeDefined();
    });

    (hasDatabase ? it : it.skip)('should reject getting non-existent audio', async () => {
      const response = await request(app)
        .get('/api/v1/assets/audio/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).get(`/api/v1/assets/audio/${assetId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/assets/:id', () => {
    let assetId: string;

    beforeEach(async () => {
      if (hasDatabase) {
        const asset = await createTestAsset(testUser.id, 'image', {
          name: 'test-image.jpg',
          url: 'test-image-key',
        });
        assetId = asset.id;
      } else {
        assetId = 'test-asset-id';
      }
    });

    (hasDatabase ? it : it.skip)('should delete an asset', async () => {
      const response = await request(app)
        .delete(`/api/v1/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // Verify asset is deleted
      if (hasDatabase) {
        const prisma = getPrismaClient();
        const deletedAsset = await prisma.asset.findUnique({
          where: { id: assetId },
        });
        expect(deletedAsset).toBeNull();
        await prisma.$disconnect();
      }
    });

    (hasDatabase ? it : it.skip)('should reject deleting non-existent asset', async () => {
      const response = await request(app)
        .delete('/api/v1/assets/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject without authentication', async () => {
      const response = await request(app).delete(`/api/v1/assets/${assetId}`);

      expect(response.status).toBe(401);
    });
  });
});

