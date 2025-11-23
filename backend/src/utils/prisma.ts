import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// PrismaClient singleton to prevent multiple instances
// This ensures proper connection pooling
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await prisma?.$disconnect();
    });
  }

  return prisma;
}

// Export the singleton instance
export const prismaClient = getPrismaClient();

