import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    bankAccount: {
      findMany: vi.fn(),
    },
    transaction: {
      findFirst: vi.fn(),
      aggregate: vi.fn(),
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
  formatDate: () => '01/01/2025',
}));

const { prisma } = await import('@/lib/core/database/client');
const output = await import('../../../scripts/cli/utils/output');
const { listAccountBalances } = await import(
  '../../../scripts/cli/commands/account-balances'
);

describe('CLI account balances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('warns when no accounts exist', async () => {
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([]);

    await listAccountBalances();

    expect(output.printWarning).toHaveBeenCalledWith(
      'Nenhuma conta bancaria encontrada.'
    );
  });

  it('prints JSON output with balances', async () => {
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      { id: 'acc-1', name: 'Conta 1', bank: 'Banco', isActive: true },
    ]);
    vi.mocked(prisma.transaction.findFirst).mockResolvedValueOnce({
      id: 'tx-1',
      date: new Date('2025-01-10T00:00:00.000Z'),
    });
    vi.mocked(prisma.transaction.aggregate).mockResolvedValueOnce({
      _sum: { amount: 123.45 },
      _count: 2,
    });

    await listAccountBalances({ json: true });

    expect(output.printJson).toHaveBeenCalledWith([
      {
        bankAccountId: 'acc-1',
        accountName: 'Conta 1',
        bankName: 'Banco',
        balance: 123.45,
        transactionCount: 2,
        lastTransactionDate: new Date('2025-01-10T00:00:00.000Z'),
      },
    ]);
  });
});
