import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js functions first
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma client before any imports that use it
vi.mock('@/lib/database/client', () => ({
  prisma: {
    processedTransaction: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    transactionSuggestion: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    property: {
      findMany: vi.fn(),
    },
    categorizationRule: {
      findMany: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
    $transaction: vi.fn((fn: any) => fn()),
  },
}));

// Now import the action after mocks are set up
const { bulkDeleteTransactionsAction } = await import('@/app/transacoes/actions');
const { prisma: mockPrismaClient } = await import('@/lib/database/client');

describe('Bulk Delete Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkDeleteTransactionsAction', () => {
    it('should successfully delete multiple transactions', async () => {
      const transactionIds = ['trans-1', 'trans-2', 'trans-3'];
      
      mockPrismaClient.processedTransaction.deleteMany.mockResolvedValue({
        count: 3,
      });

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(3);
      expect(result.message).toBe('Successfully deleted 3 transactions');
      
      expect(mockPrismaClient.processedTransaction.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: transactionIds },
        },
      });
    });

    it('should handle empty array of IDs', async () => {
      mockPrismaClient.processedTransaction.deleteMany.mockResolvedValue({
        count: 0,
      });

      const result = await bulkDeleteTransactionsAction({
        ids: [],
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(0);
      expect(result.message).toBe('Successfully deleted 0 transactions');
    });

    it('should handle single transaction deletion', async () => {
      const transactionIds = ['trans-1'];
      
      mockPrismaClient.processedTransaction.deleteMany.mockResolvedValue({
        count: 1,
      });

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1);
      expect(result.message).toBe('Successfully deleted 1 transactions');
    });

    it('should handle database errors gracefully', async () => {
      const transactionIds = ['trans-1', 'trans-2'];
      
      mockPrismaClient.processedTransaction.deleteMany.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete transactions');
      expect(result.deletedCount).toBe(0);
    });

    it('should handle partial deletions (some IDs not found)', async () => {
      const transactionIds = ['trans-1', 'trans-2', 'non-existent'];
      
      // Prisma deleteMany will only delete existing records
      mockPrismaClient.processedTransaction.deleteMany.mockResolvedValue({
        count: 2, // Only 2 out of 3 were found and deleted
      });

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.message).toBe('Successfully deleted 2 transactions');
    });

    it('should validate input with Zod schema', async () => {
      // Test with invalid input (not an array)
      await expect(
        bulkDeleteTransactionsAction({
          // @ts-expect-error Testing invalid input
          ids: 'not-an-array',
        })
      ).rejects.toThrow();

      // Test with invalid array items
      await expect(
        bulkDeleteTransactionsAction({
          // @ts-expect-error Testing invalid input
          ids: [123, 456], // Numbers instead of strings
        })
      ).rejects.toThrow();
    });

    it('should handle large batch deletions', async () => {
      // Generate 1000 IDs
      const transactionIds = Array.from({ length: 1000 }, (_, i) => `trans-${i}`);
      
      mockPrismaClient.processedTransaction.deleteMany.mockResolvedValue({
        count: 1000,
      });

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(1000);
      expect(result.message).toBe('Successfully deleted 1000 transactions');
    });

    it('should handle database constraint violations', async () => {
      const transactionIds = ['trans-1'];
      
      mockPrismaClient.processedTransaction.deleteMany.mockRejectedValue(
        new Error('Foreign key constraint violation')
      );

      const result = await bulkDeleteTransactionsAction({
        ids: transactionIds,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete transactions');
      expect(result.deletedCount).toBe(0);
    });
  });
});