import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    bankAccount: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printError: vi.fn(),
  printSuccess: vi.fn(),
  printWarning: vi.fn(),
  printJson: vi.fn(),
  printHeader: vi.fn(),
  formatCurrency: (value: number) => `R$ ${value}`,
  formatDate: (date: Date) => date.toISOString().split('T')[0],
}));

const { prisma } = await import('@/lib/core/database/client');
const output = await import('../../../scripts/cli/utils/output');
const { createTransaction } = await import(
  '../../../scripts/cli/commands/create-transaction'
);

describe('CLI create-transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores details and prints JSON output', async () => {
    const transactionCreate = vi.fn().mockResolvedValue({
      id: 'tx-1',
      date: new Date('2024-02-10T00:00:00Z'),
      description: 'Pagamento',
      amount: 100,
      bankAccount: { name: 'Conta 1' },
    });
    const processedCreate = vi.fn().mockResolvedValue({
      id: 'ptx-1',
      details: 'Observacao',
      transaction: {
        id: 'tx-1',
        date: new Date('2024-02-10T00:00:00Z'),
        description: 'Pagamento',
        amount: 100,
        bankAccount: { name: 'Conta 1' },
      },
      category: null,
      property: null,
    });

    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue({
      id: 'acc-1',
      name: 'Conta 1',
    });
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      const tx = {
        transaction: { create: transactionCreate },
        processedTransaction: { create: processedCreate },
      };
      return callback(tx as any);
    });

    await createTransaction({
      account: 'Conta 1',
      amount: '100',
      date: '2024-02-10',
      description: 'Pagamento',
      details: '  Observacao  ',
      json: true,
    });

    expect(processedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: 'Observacao',
        }),
      })
    );

    expect(output.printJson).toHaveBeenCalledWith({
      success: true,
      transaction: {
        id: 'tx-1',
        processedId: 'ptx-1',
        bankAccount: 'Conta 1',
        date: new Date('2024-02-10T00:00:00Z'),
        description: 'Pagamento',
        details: 'Observacao',
        amount: '100',
        category: null,
        property: null,
      },
    });
  });
});
