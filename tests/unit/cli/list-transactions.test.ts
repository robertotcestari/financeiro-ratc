import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    bankAccount: {
      findFirst: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printHeader: vi.fn(),
  printTable: vi.fn(),
  printJson: vi.fn(),
  printWarning: vi.fn(),
  printInfo: vi.fn(),
  formatCurrency: (value: number) => `R$ ${value}`,
  formatDate: (date: Date) => date.toISOString().split('T')[0],
  truncate: (value: string) => value,
}));

const { prisma } = await import('@/lib/core/database/client');
const output = await import('../../../scripts/cli/utils/output');
const { listTransactions } = await import(
  '../../../scripts/cli/commands/list-transactions'
);

describe('CLI list-transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns when account filter is not found', async () => {
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue(null);

    await listTransactions({ account: 'Banco X' });

    expect(output.printWarning).toHaveBeenCalledWith(
      'Conta nao encontrada: Banco X'
    );
    expect(prisma.transaction.findMany).not.toHaveBeenCalled();
  });

  it('prints JSON output when json option is enabled', async () => {
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue({
      id: 'acc-1',
      name: 'Conta 1',
    });
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: 'tx-1',
        date: new Date('2024-01-15T00:00:00Z'),
        description: 'Pagamento',
        amount: 123.45,
        bankAccount: { name: 'Conta 1' },
        processedTransaction: {
          category: { id: 'cat-1', name: 'Categoria' },
          property: { code: 'A1' },
          isReviewed: true,
          details: 'Detalhes',
        },
      },
    ]);

    await listTransactions({ json: true, limit: 10 });

    expect(output.printJson).toHaveBeenCalledWith([
      {
        id: 'tx-1',
        date: '2024-01-15',
        description: 'Pagamento',
        amount: 123.45,
        account: 'Conta 1',
        category: 'Categoria',
        property: 'A1',
        isReviewed: true,
        details: 'Detalhes',
      },
    ]);
  });

  it('caps query limit at 500', async () => {
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([
      {
        id: 'tx-1',
        date: new Date('2024-01-15T00:00:00Z'),
        description: 'Pagamento',
        amount: 123.45,
        bankAccount: { name: 'Conta 1' },
        processedTransaction: null,
      },
    ]);

    await listTransactions({ limit: 999 });

    const args = vi.mocked(prisma.transaction.findMany).mock.calls[0][0] as {
      take?: number;
    };
    expect(args.take).toBe(500);
  });
});
