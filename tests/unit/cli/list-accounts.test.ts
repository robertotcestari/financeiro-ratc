import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    bankAccount: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../scripts/cli/utils/output', () => ({
  printHeader: vi.fn(),
  printTable: vi.fn(),
  printJson: vi.fn(),
  printWarning: vi.fn(),
}));

const { prisma } = await import('@/lib/core/database/client');
const output = await import('../../../scripts/cli/utils/output');
const { listAccounts, findBankAccount } = await import(
  '../../../scripts/cli/commands/list-accounts'
);

describe('CLI list-accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prints a warning when no accounts are found', async () => {
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([]);

    await listAccounts();

    expect(output.printWarning).toHaveBeenCalledWith(
      'Nenhuma conta bancaria encontrada.'
    );
    expect(output.printJson).not.toHaveBeenCalled();
  });

  it('prints JSON when json option is enabled', async () => {
    vi.mocked(prisma.bankAccount.findMany).mockResolvedValue([
      {
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      },
    ]);

    await listAccounts({ json: true });

    expect(output.printJson).toHaveBeenCalledWith([
      {
        id: 'acc-1',
        name: 'Conta 1',
        type: 'CHECKING',
        bank: 'Banco',
        isActive: true,
      },
    ]);
    expect(output.printHeader).not.toHaveBeenCalled();
    expect(output.printTable).not.toHaveBeenCalled();
  });

  it('finds a bank account by id first', async () => {
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue({
      id: 'acc-123',
      name: 'Conta X',
      type: 'CHECKING',
      bank: 'Banco',
      isActive: true,
    });

    const result = await findBankAccount('acc-123');

    expect(result?.id).toBe('acc-123');
    expect(prisma.bankAccount.findFirst).not.toHaveBeenCalled();
  });

  it('falls back to name search when id is not found', async () => {
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.bankAccount.findFirst).mockResolvedValue({
      id: 'acc-456',
      name: 'Conta Y',
      type: 'SAVINGS',
      bank: 'Banco',
      isActive: true,
    });

    const result = await findBankAccount('Conta Y');

    expect(result?.id).toBe('acc-456');
    expect(prisma.bankAccount.findFirst).toHaveBeenCalled();
  });
});
