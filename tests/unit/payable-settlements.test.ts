import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    payableInstallment: {
      findUnique: vi.fn(),
    },
    payable: {
      findUnique: vi.fn(),
    },
    bankAccount: {
      findUnique: vi.fn(),
    },
    transaction: {
      findUnique: vi.fn(),
    },
    payableSettlement: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    processedTransaction: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/core/database/categorization', () => ({
  categorizeTransaction: vi.fn(),
}));

vi.mock('@/lib/core/database/payables', () => ({
  getPayableById: vi.fn(),
  recalculatePayableTotals: vi.fn(),
}));

import { prisma } from '@/lib/core/database/client';
import { categorizeTransaction } from '@/lib/core/database/categorization';
import { getPayableById, recalculatePayableTotals } from '@/lib/core/database/payables';
import { settleInstallment } from '@/lib/core/database/payable-settlements';
import { PayableError } from '@/lib/core/payables/errors';

const installment = {
  id: 'inst-1',
  payableId: 'pay-1',
  status: 'OPEN',
  remainingAmount: 150,
  paymentMethod: 'BOLETO',
  payable: {
    status: 'OPEN',
    categoryId: 'cat-1',
    propertyId: 'prop-1',
    description: 'Condomínio julho',
  },
};

describe('settleInstallment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.payableInstallment.findUnique).mockResolvedValue(
      installment as never
    );
    vi.mocked(prisma.bankAccount.findUnique).mockResolvedValue({
      id: 'bank-1',
    } as never);
    vi.mocked(prisma.payableSettlement.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      const tx = {
        payableSettlement: {
          create: vi.fn().mockResolvedValue({ id: 'set-1' }),
        },
      };
      return fn(tx as never);
    });
    vi.mocked(getPayableById).mockResolvedValue({ id: 'pay-1' } as never);
    vi.mocked(recalculatePayableTotals).mockResolvedValue({} as never);
  });

  it('rejects a second settlement for the same transactionId', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'tx-1',
    } as never);
    vi.mocked(prisma.payableSettlement.findUnique).mockResolvedValue({
      id: 'set-existing',
    } as never);

    await expect(
      settleInstallment({
        installmentId: 'inst-1',
        bankAccountId: 'bank-1',
        paidAt: '2026-08-10',
        transactionId: 'tx-1',
      })
    ).rejects.toMatchObject({
      code: 'transaction_already_settled',
    } satisfies Partial<PayableError>);
  });

  it('applies category only when the processed transaction has none', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'tx-1',
    } as never);
    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue({
      id: 'pt-1',
      categoryId: null,
      details: null,
    } as never);

    await settleInstallment({
      installmentId: 'inst-1',
      bankAccountId: 'bank-1',
      paidAt: '2026-08-10',
      transactionId: 'tx-1',
    });

    expect(categorizeTransaction).toHaveBeenCalledWith(
      'pt-1',
      'cat-1',
      'prop-1'
    );
  });

  it('does not overwrite an existing category', async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      id: 'tx-1',
    } as never);
    vi.mocked(prisma.processedTransaction.findUnique).mockResolvedValue({
      id: 'pt-1',
      categoryId: 'already-set',
      details: 'manual',
    } as never);

    await settleInstallment({
      installmentId: 'inst-1',
      bankAccountId: 'bank-1',
      paidAt: '2026-08-10',
      transactionId: 'tx-1',
    });

    expect(categorizeTransaction).not.toHaveBeenCalled();
  });
});
