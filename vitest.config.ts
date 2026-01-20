import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Load test environment variables quietly
config({ path: resolve(rootDir, '.env.test'), quiet: true });

/**
 * Local dev note (per repo docs): MySQL dev uses `root` with no password.
 *
 * If `.env.test` contains a passworded root URL, Prisma integration tests will fail
 * with auth errors in such setups. For tests only, default to passwordless root
 * unless explicitly opted out.
 */
const shouldKeepDbPassword = process.env.VITEST_KEEP_DB_PASSWORD === 'true';
const databaseUrl = process.env.DATABASE_URL;
if (!shouldKeepDbPassword && databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.username === 'root' && parsed.password) {
      parsed.password = '';
      // URL serialization keeps an empty password as `root:@` - normalize it.
      process.env.DATABASE_URL = parsed
        .toString()
        .replace('://root:@', '://root@');
    }
  } catch {
    // If DATABASE_URL isn't parseable by URL, leave it as-is.
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    globalSetup: ['vitest.global-setup.ts'],
    // Default to jsdom so React component tests work without per-file directives
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts', 'vitest.setup.ts'],

    // Use 2 threads for moderate parallelism without race conditions
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 3,
        maxThreads: 3, // Conservative parallel execution
      },
    },

    // Keep tests sequential within files for stability
    sequence: {
      concurrent: false,
    },

    // Reasonable timeouts for faster feedback
    hookTimeout: 10000, // 10 seconds (was 20s)
    testTimeout: 10000, // 10 seconds (was 20s)

    // Prevent Vitest from picking up Playwright tests and other non-unit suites
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],

    // Suppress known noisy stderr logs that don't affect test outcomes
    // Keep this list tight to avoid hiding real issues
    onConsoleLog(log, type) {
      if (type !== 'stderr') return; // only screen stderr noise

      const suppressedPatterns: RegExp[] = [
        /Switch is changing from controlled to uncontrolled/i,
        /^Error in .*Action:/i, // server action negative-path tests
        /Database cleanup failed/i,
        /Cleanup warning/i,
        /Test cleanup error/i,
        // Add other known harmless warnings below as needed
      ];

      if (suppressedPatterns.some((re) => re.test(log))) {
        return false; // swallow this log line
      }
    },
  },
});
