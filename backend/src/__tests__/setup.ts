import { PrismaClient } from '@prisma/client';

// Only initialize Prisma if DATABASE_URL is available
let prisma: PrismaClient | null = null;

if (process.env.TEST_DATABASE_URL || process.env.DATABASE_URL) {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

  // Clean up database before each test
  beforeEach(async () => {
    if (prisma) {
      // Delete all records in reverse order of dependencies
      await prisma.story.deleteMany();
      await prisma.asset.deleteMany();
      await prisma.user.deleteMany();
    }
  });

  // Disconnect Prisma after all tests
  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });
}

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

