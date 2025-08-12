import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

// Load test environment variables quietly
config({ path: resolve(rootDir, '.env.test'), quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
    },
  },
  test: {
    // Default to jsdom so React component tests work without per-file directives
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],

    // Use a single worker to avoid cross-file DB race conditions (Prisma)
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1,
      },
    },

    // Ensure tests don't attempt to run concurrently within a file
    sequence: {
      concurrent: false,
    },

    // Slightly higher timeouts for integration tests
    hookTimeout: 20000,
    testTimeout: 20000,

    // Prevent Vitest from picking up Playwright tests and other non-unit suites
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
  },
});
