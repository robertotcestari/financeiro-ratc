import { describe, expect, it } from 'vitest';
import {
  buildProcessedTransactionWhere,
  parseTransactionSearchParams,
  resolveTransactionFilters,
} from '@/app/(protected)/transacoes/utils/filters';
import type { TransactionSearchParams } from '@/app/(protected)/transacoes/types';

describe('transaction filters helpers', () => {
  it('parses search params ignoring empty values', () => {
    const params = new URLSearchParams([
      ['categoria', 'abc'],
      ['conta', ''],
      ['mes', '10'],
    ]);

    const parsed = parseTransactionSearchParams(params);

    expect(parsed).toEqual({
      categoria: 'abc',
      mes: '10',
    });
  });

  it('resolves default year when missing', () => {
    const filters: TransactionSearchParams = {};
    const resolved = resolveTransactionFilters(filters, 2024);

    expect(resolved.ano).toBe('2024');
  });

  it('builds OR conditions for pending status', () => {
    const where = buildProcessedTransactionWhere({
      status: 'pendentes',
    });

    expect(where.OR).toBeDefined();
    expect(Array.isArray(where.OR)).toBe(true);
    expect((where.OR as unknown[]).length).toBe(3);
  });

  it('combines search with pending status using AND block', () => {
    const where = buildProcessedTransactionWhere({
      status: 'pendentes',
      busca: 'aluguel',
    });

    expect(where.AND).toBeDefined();
    const andConditions = where.AND as unknown[];
    expect(andConditions.length).toBe(2);

    const orCondition = andConditions[0] as { OR: unknown[] };
    expect(Array.isArray(orCondition.OR)).toBe(true);
    expect(orCondition.OR.length).toBe(3);
  });
});
