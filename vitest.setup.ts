// Vitest global setup for both node and jsdom environments
import '@testing-library/jest-dom/vitest';

// MSW server setup (Node)
// You can add handlers in tests/mocks/handlers.ts as the project grows.
import { server } from './tests/mocks/node';

// Only start MSW in Node environment
if (typeof process !== 'undefined') {
  beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
