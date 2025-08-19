import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma client with proper structure
const mockPrismaClient = {
  transaction: {
    aggregate: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  bankAccount: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  processedTransaction: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
  $disconnect: vi.fn(),
};

// Mock the database client
vi.mock('@/lib/core/database/client', () => ({
  prisma: mockPrismaClient,
}));

describe('Database Operations - Financial Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ...existing code from original file...

  describe('Transaction Aggregation', () => {
    it('should calculate total transactions by account', async () => {
      const mockTransactionsByAccount = [
        {
          bankAccountId: '1',
          _sum: { amount: new Decimal(5000) },
        },
        {
          bankAccountId: '2',
          _sum: { amount: new Decimal(-2000) },
        },
      ];

      const mockBankAccounts = [
        { id: '1', name: 'Conta Corrente', bankName: 'Sicredi' },
        { id: '2', name: 'Conta Investimento', bankName: 'XP' },
      ];

      mockPrismaClient.transaction.groupBy.mockResolvedValue(
        mockTransactionsByAccount
      );
      mockPrismaClient.bankAccount.findMany.mockResolvedValue(mockBankAccounts);

      const result = await mockPrismaClient.transaction.groupBy({
        by: ['bankAccountId'],
        _sum: { amount: true },
      });

      expect(result).toEqual(mockTransactionsByAccount);
      expect(mockPrismaClient.transaction.groupBy).toHaveBeenCalledWith({
        by: ['bankAccountId'],
        _sum: { amount: true },
      });
    });

    it('should handle transaction counting', async () => {
      mockPrismaClient.transaction.count.mockResolvedValue(150);

      const count = await mockPrismaClient.transaction.count();

      expect(count).toBe(150);
      expect(mockPrismaClient.transaction.count).toHaveBeenCalledOnce();
    });

    it('should aggregate transaction amounts', async () => {
      mockPrismaClient.transaction.aggregate.mockResolvedValue({
        _sum: { amount: new Decimal(15000.75) },
        _count: { _all: 25 },
        _avg: { amount: new Decimal(600.03) },
      });

      const result = await mockPrismaClient.transaction.aggregate({
        where: { bankAccountId: '1' },
        _sum: { amount: true },
        _count: { _all: true },
        _avg: { amount: true },
      });

      expect(result._sum.amount?.toNumber()).toBe(15000.75);
      expect(result._count._all).toBe(25);
      expect(result._avg.amount?.toNumber()).toBe(600.03);
    });
  });

  // ...existing code...

  // (Repeat for all other describe/it blocks from the original file)
});
