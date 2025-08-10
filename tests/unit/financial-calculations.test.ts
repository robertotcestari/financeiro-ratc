import { describe, expect, it, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { calculateRunningBalance } from '../../lib/financial-calculations';

// Mock prisma client
vi.mock('../../lib/database/client', () => ({
  prisma: {
    transaction: {
      aggregate: vi.fn(),
    },
  },
}));

describe('calculateRunningBalance', () => {
  it('calculates running balance for empty array', () => {
    const result = calculateRunningBalance([]);
    expect(result).toEqual([]);
  });

  it('calculates running balance for single transaction', () => {
    const transactions = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal(100),
        description: 'Initial deposit',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(100);
    expect(result[0].id).toBe('1');
  });

  it('calculates running balance for multiple transactions in chronological order', () => {
    const transactions = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal(1000),
        description: 'Initial deposit',
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        amount: new Decimal(-200),
        description: 'Withdrawal',
      },
      {
        id: '3',
        date: new Date('2024-01-03'),
        amount: new Decimal(300),
        description: 'Another deposit',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result).toHaveLength(3);
    expect(result[0].balance).toBe(1000);
    expect(result[1].balance).toBe(800);
    expect(result[2].balance).toBe(1100);
  });

  it('sorts transactions by date before calculating balance', () => {
    const transactions = [
      {
        id: '3',
        date: new Date('2024-01-03'),
        amount: new Decimal(300),
        description: 'Latest transaction',
      },
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal(1000),
        description: 'First transaction',
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        amount: new Decimal(-200),
        description: 'Middle transaction',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result).toHaveLength(3);
    // Should be sorted by date, so first transaction should have id '1'
    expect(result[0].id).toBe('1');
    expect(result[0].balance).toBe(1000);
    expect(result[1].id).toBe('2');
    expect(result[1].balance).toBe(800);
    expect(result[2].id).toBe('3');
    expect(result[2].balance).toBe(1100);
  });

  it('handles decimal precision correctly', () => {
    const transactions = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal('10.50'),
        description: 'Small amount',
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        amount: new Decimal('0.05'),
        description: 'Very small amount',
      },
      {
        id: '3',
        date: new Date('2024-01-03'),
        amount: new Decimal('-3.33'),
        description: 'Negative amount',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result).toHaveLength(3);
    expect(result[0].balance).toBe(10.5);
    expect(result[1].balance).toBe(10.55);
    expect(result[2].balance).toBe(7.22);
  });

  it('handles negative balances', () => {
    const transactions = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal(100),
        description: 'Initial deposit',
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        amount: new Decimal(-200),
        description: 'Large withdrawal',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result).toHaveLength(2);
    expect(result[0].balance).toBe(100);
    expect(result[1].balance).toBe(-100);
  });

  it('preserves original transaction properties', () => {
    const transactions = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        amount: new Decimal(100),
        description: 'Test transaction',
        category: 'Income',
        bankAccountId: 'bank1',
      },
    ];

    const result = calculateRunningBalance(transactions);

    expect(result[0].id).toBe('1');
    expect(result[0].description).toBe('Test transaction');
    expect(result[0].category).toBe('Income');
    expect(result[0].bankAccountId).toBe('bank1');
    expect(result[0].balance).toBe(100);
  });
});
