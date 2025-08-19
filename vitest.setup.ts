// Vitest global setup for both node and jsdom environments
// Test setup shared by all Vitest suites
// Note: We suppress a few known-noisy console warnings/errors that are expected in negative-path tests
// If you need to debug logs, run with VITEST_DEBUG_LOGS=true to disable suppression.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

// Quiet noisy stderr logs during tests while keeping meaningful ones
beforeAll(() => {
  if (process.env.VITEST_DEBUG_LOGS === 'true') return; // allow opting out when debugging

  const originalError = console.error;
  const originalWarn = console.warn;

  const suppressedPatterns: RegExp[] = [
    /Switch is changing from controlled to uncontrolled/i,
    /^Error in .*Action:/i, // server action negative-path tests intentionally log
    /Database cleanup failed/i,
    /Cleanup warning/i,
    /Test cleanup error/i,
  ];

  const shouldSuppress = (args: unknown[]) => {
    try {
      const msg = args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
        .join(' ');
      return suppressedPatterns.some((re) => re.test(msg));
    } catch {
      return false;
    }
  };

  console.error = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalError(...(args as Parameters<typeof originalError>));
  };

  console.warn = (...args: unknown[]) => {
    if (shouldSuppress(args)) return;
    originalWarn(...(args as Parameters<typeof originalWarn>));
  };
});

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
