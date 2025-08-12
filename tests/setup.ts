import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/node';

// Start the MSW server before all tests
beforeAll(() => {
  // Use "warn" on unknown requests to help catch missing handlers without failing the suite
  server.listen({ onUnhandledRequest: 'warn' });
});

// Reset any runtime request handlers we may add during the tests
afterEach(() => {
  server.resetHandlers();
  // Ensure DOM is cleaned between tests for jsdom env
  cleanup();
});

// Clean up MSW once the tests are done
afterAll(() => {
  server.close();
});
