import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables quietly
config({ path: resolve(process.cwd(), '.env.test'), quiet: true });

// Ensure we're using test database
beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('Tests must use a test database. DATABASE_URL should contain "test"');
  }
});

// Reset DOM between tests for jsdom environment
afterEach(() => {
  cleanup();
});
