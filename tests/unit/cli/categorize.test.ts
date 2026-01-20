import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    processedTransaction: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/core/database/categorization', () => ({
  bulkCategorizeTransactions: vi.fn(),
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printError: vi.fn(),
  printWarning: vi.fn(),
  printSuccess: vi.fn(),
  printJson: vi.fn(),
}));

const { prisma } = await import('@/lib/core/database/client');
const categorization = await import('@/lib/core/database/categorization');
const output = await import('../../../scripts/cli/utils/output');
const { categorizeTransactions } = await import('../../../scripts/cli/commands/categorize');

describe('CLI categorize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('errors when no targets are provided', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue({
      id: 'cat-1',
    });

    await categorizeTransactions({ category: 'cat-1' });

    expect(output.printError).toHaveBeenCalledWith(
      'Informe --ids, --transactions ou --uncategorized.'
    );
  });

  it('categorizes by transaction ids', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.category.findFirst).mockResolvedValue({
      id: 'cat-1',
      name: 'Categoria',
    });
    vi.mocked(prisma.processedTransaction.findMany).mockResolvedValue([
      { id: 'ptx-1' },
      { id: 'ptx-2' },
    ]);
    vi.mocked(categorization.bulkCategorizeTransactions).mockResolvedValue([
      { transactionId: 'ptx-1', success: true },
      { transactionId: 'ptx-2', success: true },
    ]);

    await categorizeTransactions({
      category: 'Categoria',
      transactions: 't1,t2',
    });

    expect(categorization.bulkCategorizeTransactions).toHaveBeenCalledWith(
      ['ptx-1', 'ptx-2'],
      'cat-1',
      undefined
    );
    expect(output.printSuccess).toHaveBeenCalledWith('Categorizacao concluida: 2/2');
  });
});

