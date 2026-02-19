import { describe, it, expect, beforeEach, vi } from 'vitest';
import { categorizeTransaction } from '@/lib/core/database/categorization';
import { prisma } from '@/lib/core/database/client';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    processedTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Inline Edit Categorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow saving without category (uncategorized)', async () => {
    const mockProcessedTransaction = {
      id: 'test-id',
      categoryId: 'old-category',
      propertyId: 'old-property',
      transaction: { id: 'trans-1', description: 'Test' },
    };

    const mockUpdatedTransaction = {
      ...mockProcessedTransaction,
      categoryId: null,
      propertyId: null,
      category: null,
      property: null,
      transaction: {
        ...mockProcessedTransaction.transaction,
        bankAccount: { name: 'Test Account' },
      },
    };

    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue(
      mockProcessedTransaction as any
    );
    vi.mocked(prisma.processedTransaction.update).mockResolvedValue(
      mockUpdatedTransaction as any
    );

    const result = await categorizeTransaction('test-id', null, null);

    expect(prisma.processedTransaction.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: {
        category: { disconnect: true },
        property: { disconnect: true },
        updatedAt: expect.any(Date),
      },
      include: {
        category: true,
        property: true,
        transaction: {
          include: { bankAccount: true },
        },
      },
    });

    expect(result.categoryId).toBeNull();
    expect(result.propertyId).toBeNull();
  });

  it('should allow saving rent category without property', async () => {
    const mockProcessedTransaction = {
      id: 'test-id',
      categoryId: null,
      propertyId: null,
      transaction: { id: 'trans-1', description: 'Aluguel' },
    };

    const mockCategory = {
      id: 'rent-category-id',
      name: 'Aluguel',
    };

    const mockUpdatedTransaction = {
      ...mockProcessedTransaction,
      categoryId: 'rent-category-id',
      propertyId: null,
      category: mockCategory,
      property: null,
      transaction: {
        ...mockProcessedTransaction.transaction,
        bankAccount: { name: 'Test Account' },
      },
    };

    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue(
      mockProcessedTransaction as any
    );
    vi.mocked(prisma.category.findUnique).mockResolvedValue(
      mockCategory as any
    );
    vi.mocked(prisma.processedTransaction.update).mockResolvedValue(
      mockUpdatedTransaction as any
    );

    // Should NOT throw error even though rent normally requires property
    const result = await categorizeTransaction('test-id', 'rent-category-id', null);

    expect(prisma.processedTransaction.update).toHaveBeenCalledWith({
      where: { id: 'test-id' },
      data: {
        category: { connect: { id: 'rent-category-id' } },
        property: { disconnect: true },
        updatedAt: expect.any(Date),
      },
      include: {
        category: true,
        property: true,
        transaction: {
          include: { bankAccount: true },
        },
      },
    });

    expect(result.categoryId).toBe('rent-category-id');
    expect(result.propertyId).toBeNull();
  });

  it('should allow saving expense category without property', async () => {
    const mockProcessedTransaction = {
      id: 'test-id',
      categoryId: null,
      propertyId: null,
      transaction: { id: 'trans-1', description: 'Despesa' },
    };

    const mockCategory = {
      id: 'expense-category-id',
      name: 'Despesas Administrativas',
      type: 'EXPENSE',
    };

    const mockUpdatedTransaction = {
      ...mockProcessedTransaction,
      categoryId: 'expense-category-id',
      propertyId: null,
      category: mockCategory,
      property: null,
      transaction: {
        ...mockProcessedTransaction.transaction,
        bankAccount: { name: 'Test Account' },
      },
    };

    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue(
      mockProcessedTransaction as any
    );
    vi.mocked(prisma.category.findUnique).mockResolvedValue(
      mockCategory as any
    );
    vi.mocked(prisma.processedTransaction.update).mockResolvedValue(
      mockUpdatedTransaction as any
    );

    const result = await categorizeTransaction('test-id', 'expense-category-id', null);

    expect(prisma.processedTransaction.update).toHaveBeenCalled();
    expect(result.categoryId).toBe('expense-category-id');
    expect(result.propertyId).toBeNull();
  });

  it('should normalize "uncategorized" pseudo-id to null', async () => {
    const mockProcessedTransaction = {
      id: 'test-id',
      categoryId: 'some-category',
      propertyId: null,
      transaction: { id: 'trans-1', description: 'Test' },
    };

    const mockUpdatedTransaction = {
      ...mockProcessedTransaction,
      categoryId: null,
      propertyId: null,
      category: null,
      property: null,
      transaction: {
        ...mockProcessedTransaction.transaction,
        bankAccount: { name: 'Test Account' },
      },
    };

    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue(
      mockProcessedTransaction as any
    );
    vi.mocked(prisma.processedTransaction.update).mockResolvedValue(
      mockUpdatedTransaction as any
    );

    // "uncategorized" should be treated as null
    const result = await categorizeTransaction('test-id', 'uncategorized', null);

    expect(prisma.processedTransaction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: { disconnect: true },
          property: { disconnect: true },
        }),
      })
    );

    expect(result.categoryId).toBeNull();
  });
});
