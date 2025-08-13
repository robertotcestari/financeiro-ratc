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
    setupFiles: ['tests/setup.ts', 'vitest.setup.ts'],

    // Use 2 threads for moderate parallelism without race conditions
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2, // Conservative parallel execution
      },
    },

    // Keep tests sequential within files for stability
    sequence: {
      concurrent: false,
    },

    // Reasonable timeouts for faster feedback
    hookTimeout: 10000,  // 10 seconds (was 20s)
    testTimeout: 10000,  // 10 seconds (was 20s)

    // Prevent Vitest from picking up Playwright tests and other non-unit suites
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**'],
  },
});
