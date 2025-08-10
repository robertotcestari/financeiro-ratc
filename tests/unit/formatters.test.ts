import { describe, expect, it } from 'vitest';
import { formatCurrency } from '@/lib/formatters';

describe('formatCurrency', () => {
  it('formats positive values with BRL currency', () => {
    const formatted = formatCurrency(1234.56);
    expect(formatted).toMatch(/^R\$\s*/);
  });
});
