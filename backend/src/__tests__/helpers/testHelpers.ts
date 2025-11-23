import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Create Prisma client only if DATABASE_URL is available
function getPrismaClient(): PrismaClient {
  if (!process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
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

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

export interface TestStory {
  id: string;
  userId: string;
  title: string;
  content: string;
  theme: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  overrides?: Partial<TestUser>
): Promise<TestUser> {
  const prisma = getPrismaClient();
  const email = overrides?.email || `test-${Date.now()}@example.com`;
  const password = overrides?.password || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: overrides?.name || 'Test User',
    },
  });

  return {
    id: user.id,
    email: user.email,
    password, // Return plain password for testing
    name: user.name || undefined,
  };
}

/**
 * Generate a JWT token for a test user
 */
export function generateTestToken(userId: string, email: string): string {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Create a test story in the database
 */
export async function createTestStory(
  userId: string,
  overrides?: Partial<TestStory>
): Promise<TestStory> {
  const prisma = getPrismaClient();
  const story = await prisma.story.create({
    data: {
      userId,
      title: overrides?.title || 'Test Story',
      content: overrides?.content || 'This is a test story content.',
      theme: overrides?.theme || 'default',
      parameters: {},
    },
  });

  return {
    id: story.id,
    userId: story.userId,
    title: story.title,
    content: story.content,
    theme: story.theme,
  };
}

/**
 * Create a test asset in the database
 */
export async function createTestAsset(
  userId: string,
  type: 'video' | 'audio' | 'image' = 'image',
  overrides?: Partial<{ name: string; url: string; size: number }>
) {
  const prisma = getPrismaClient();
  return await prisma.asset.create({
    data: {
      userId,
      type,
      name: overrides?.name || 'test-asset',
      url: overrides?.url || 'https://example.com/test-asset',
      size: overrides?.size || 1024,
    },
  });
}

/**
 * Clean up test data
 */
export async function cleanupTestData() {
  const prisma = getPrismaClient();
  await prisma.story.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}

