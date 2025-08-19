import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate } from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats positive values with BRL currency', () => {
    const formatted = formatCurrency(1234.56);
    expect(formatted).toMatch(/^R\$\s*/);
    expect(formatted).toContain('1.234,56');
  });

  it('formats negative values correctly', () => {
    const formatted = formatCurrency(-500.75);
    expect(formatted).toMatch(/^-R\$\s*/);
    expect(formatted).toContain('500,75');
  });

  it('formats zero correctly', () => {
    const formatted = formatCurrency(0);
    expect(formatted).toMatch(/^R\$\s*/);
    expect(formatted).toContain('0,00');
  });

  it('formats large values with thousands separator', () => {
    const formatted = formatCurrency(1000000.99);
    expect(formatted).toMatch(/^R\$\s*/);
    expect(formatted).toContain('1.000.000,99');
  });

  it('formats decimal values correctly', () => {
    const formatted = formatCurrency(10.5);
    expect(formatted).toMatch(/^R\$\s*/);
    expect(formatted).toContain('10,50');
  });
});

describe('formatDate', () => {
  it('formats dates in Brazilian format', () => {
    const date = new Date('2024-12-25T10:30:00Z');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(formatted).toBe('25/12/2024');
  });

  it('handles different months correctly', () => {
    const date = new Date('2024-01-05T15:45:00Z');
    const formatted = formatDate(date);
    expect(formatted).toBe('05/01/2024');
  });

  it('handles leap year dates', () => {
    const date = new Date('2024-02-29T12:00:00Z');
    const formatted = formatDate(date);
    expect(formatted).toBe('29/02/2024');
  });

  it('handles end of year dates', () => {
    const date = new Date('2023-12-31T23:59:59Z');
    const formatted = formatDate(date);
    expect(formatted).toBe('31/12/2023');
  });
});
