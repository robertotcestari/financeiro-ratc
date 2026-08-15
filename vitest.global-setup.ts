import { createPrismaClient } from '@/lib/core/database/client';

/**
 * Vitest global setup
 *
 * Runs before tests are collected/executed.
 * We use it to detect whether a DB is reachable using the current DATABASE_URL.
 * If not, DB-backed integration specs will be conditionally skipped.
 */
export default async function globalSetup() {
  try {
    const client = createPrismaClient();
    try {
      await Promise.race([
        client.$queryRaw`SELECT 1`,
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('database connectivity timeout')), 2000);
        }),
      ]);
    } finally {
      await client.$disconnect().catch(() => {});
    }
  } catch {
    process.env.VITEST_SKIP_DB_TESTS = 'true';
  }

  return async () => {
    // no-op teardown
  };
}
