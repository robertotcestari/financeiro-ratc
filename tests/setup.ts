import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@/app/generated/prisma/client';
import { createPrismaClient } from '@/lib/core/database/client';

// Mock ResizeObserver for all tests (needed by cmdk component)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock scrollIntoView for all tests (needed by cmdk component)
Element.prototype.scrollIntoView = () => {};

/**
 * DB-backed integration tests require a working DATABASE_URL.
 * If the database is not reachable in the current environment, we mark DB tests
 * to be skipped (they will be conditionally skipped by the integration specs).
 */
let prisma: PrismaClient | null = null;

async function canConnectToDatabase(): Promise<boolean> {
  try {
    const client = createPrismaClient();
    try {
      await Promise.race([
        client.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('database connectivity timeout')), 2000);
        }),
      ]);
      return true;
    } finally {
      await client.$disconnect().catch(() => {});
    }
  } catch {
    return false;
  }
}

beforeAll(async () => {
  const ok = await canConnectToDatabase();
  if (!ok) {
    process.env.VITEST_SKIP_DB_TESTS = 'true';
    return;
  }

  prisma = createPrismaClient();
  // Best-effort cleanup for DB integration tests. This is safe even when
  // running only unit/component tests (tables may be empty).
  try {
    await prisma.accountSnapshot.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.bankAccount.deleteMany({});
  } catch (error) {
    console.warn(
      'Database cleanup failed:',
      error instanceof Error ? error.message : error
    );
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
  }
});
