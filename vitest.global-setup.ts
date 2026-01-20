import { PrismaClient } from './app/generated/prisma';

/**
 * Vitest global setup
 *
 * Runs before tests are collected/executed.
 * We use it to detect whether a DB is reachable using the current DATABASE_URL.
 * If not, DB-backed integration specs will be conditionally skipped.
 */
export default async function globalSetup() {
  const client = new PrismaClient();
  try {
    await client.$queryRaw`SELECT 1`;
  } catch {
    process.env.VITEST_SKIP_DB_TESTS = 'true';
  } finally {
    await client.$disconnect().catch(() => {});
  }

  return async () => {
    // no-op teardown
  };
}
