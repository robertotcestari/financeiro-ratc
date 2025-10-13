import { describe, expect, it } from 'vitest';
import { buildTransactionsExportFilename } from '@/lib/features/transactions/export-transactions';

describe('transactions export helpers', () => {
  it('builds filename with padded month and year', () => {
    const filename = buildTransactionsExportFilename({
      ano: '2025',
      mes: '3',
    });
    expect(filename).toBe('transacoes_2025_03.csv');
  });

  it('handles missing filters gracefully', () => {
    const filename = buildTransactionsExportFilename({});
    expect(filename).toBe('transacoes_todos-anos_todos-meses.csv');
  });
});
