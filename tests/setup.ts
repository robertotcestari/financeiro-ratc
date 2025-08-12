import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Reset DOM between tests for jsdom environment
afterEach(() => {
  cleanup();
});
