import { describe, expect, it } from 'vitest';
import {
  competenceDateFor,
  dueDateForRecurrence,
  nextRunAfter,
} from '@/lib/core/payables/dates';

describe('payable recurrence dates', () => {
  it('clamps day of month to the last day of short months', () => {
    expect(dueDateForRecurrence(2026, 2, 31).toISOString().slice(0, 10)).toBe(
      '2026-02-28'
    );
  });

  it('builds competence as first day of month', () => {
    expect(competenceDateFor(2026, 7).toISOString().slice(0, 10)).toBe(
      '2026-07-01'
    );
  });

  it('advances monthly and yearly run dates', () => {
    const start = dueDateForRecurrence(2026, 1, 10);
    expect(nextRunAfter(start, 'MONTHLY').toISOString().slice(0, 10)).toBe(
      '2026-02-10'
    );
    expect(nextRunAfter(start, 'YEARLY').toISOString().slice(0, 10)).toBe(
      '2027-01-10'
    );
  });
});
