// Vitest global setup for both node and jsdom environments
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

// Clean up DOM between tests only in jsdom environment
if (typeof window !== 'undefined') {
  afterEach(() => {
    // Clean up the DOM after each test
    document.body.innerHTML = '';
  });
}
