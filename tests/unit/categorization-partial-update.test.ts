import { describe, it, expect, beforeEach, vi } from 'vitest';
import { categorizeTransaction } from '@/lib/core/database/categorization';
import { prisma } from '@/lib/core/database/client';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    processedTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('categorizeTransaction partial updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue({
      id: 't-1',
      transaction: { id: 'raw-1' },
    } as any);
    vi.mocked(prisma.processedTransaction.update).mockResolvedValue({
      id: 't-1',
      categoryId: 'cat-1',
      propertyId: 'prop-1',
      category: null,
      property: null,
      transaction: { bankAccount: { name: 'x' } },
    } as any);
  });

  it('updates only category when property is undefined', async () => {
    await categorizeTransaction('t-1', 'cat-xyz', undefined);
    expect(prisma.processedTransaction.update).toHaveBeenCalled();
    const arg = vi.mocked(prisma.processedTransaction.update).mock.calls[0][0] as any;
    expect(arg.data.categoryId).toBe('cat-xyz');
    expect(arg.data).not.toHaveProperty('propertyId');
    expect(arg.data.updatedAt).toBeInstanceOf(Date);
  });

  it('updates only property when category is undefined', async () => {
    await categorizeTransaction('t-1', undefined, 'prop-xyz');
    const arg = vi.mocked(prisma.processedTransaction.update).mock.calls[0][0] as any;
    expect(arg.data.propertyId).toBe('prop-xyz');
    expect(arg.data).not.toHaveProperty('categoryId');
    expect(arg.data.updatedAt).toBeInstanceOf(Date);
  });

  it('clears category when category is null', async () => {
    await categorizeTransaction('t-1', null, undefined);
    const arg = vi.mocked(prisma.processedTransaction.update).mock.calls[0][0] as any;
    expect(arg.data.categoryId).toBeNull();
    expect(arg.data).not.toHaveProperty('propertyId');
  });

  it('clears property when property is null', async () => {
    await categorizeTransaction('t-1', undefined, null);
    const arg = vi.mocked(prisma.processedTransaction.update).mock.calls[0][0] as any;
    expect(arg.data.propertyId).toBeNull();
    expect(arg.data).not.toHaveProperty('categoryId');
  });
});

