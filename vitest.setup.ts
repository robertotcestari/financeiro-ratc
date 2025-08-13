// Vitest global setup for both node and jsdom environments
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Clean up DOM between tests only in jsdom environment
if (typeof window !== 'undefined') {
  afterEach(() => {
    // First let Testing Library perform a proper unmount/cleanup
    cleanup();
    // Remove any scroll lock and pointer-events styles that some UI libs set on <body>
    if (document.body.style) {
      document.body.style.removeProperty('pointer-events');
      document.body.removeAttribute('data-scroll-locked');
      document.body.style.overflow = '';
    }
  });
}
