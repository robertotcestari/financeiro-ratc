import { describe, expect, it } from 'vitest';

// Simple integration test to exercise MSW server in Node env

describe('MSW server', () => {
  it('responds to mocked request', async () => {
    const res = await fetch('https://api.example.com/health');
    const json = await res.json();
    expect(json).toEqual({ status: 'ok' });
  });
});
