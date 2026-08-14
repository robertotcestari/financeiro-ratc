import { Prisma } from '@/app/generated/prisma';
import type { PayablePaymentMethod } from '@/app/generated/prisma';
import { prisma } from './client';
import { categorizeTransaction } from './categorization';
import { getPayableById, recalculatePayableTotals } from './payables';
import { PayableError } from '@/lib/core/payables/errors';
import { utcDateFromIso } from '@/lib/core/payables/dates';
import { roundMoney, toNumber } from '@/lib/core/payables/money';
import { isOpenInstallmentStatus } from '@/lib/core/payables/status';

export type SettleInstallmentInput = {
  installmentId: string;
  bankAccountId: string;
  amount?: number;
  paidAt: string;
  method?: PayablePaymentMethod;
  transactionId?: string | null;
  notes?: string | null;
  createdById?: string | null;
};

async function applyCategoryIfEmpty(
  transactionId: string,
  categoryId: string | null,
  propertyId: string | null,
  details: string | null
) {
  const processed = await prisma.processedTransaction.findUnique({
    where: { transactionId },
  });
  if (!processed || processed.categoryId) return;

  await categorizeTransaction(
    processed.id,
    categoryId ?? undefined,
    propertyId ?? undefined
  );

  if (details && !processed.details) {
    await prisma.processedTransaction.update({
      where: { id: processed.id },
      data: { details },
    });
  }
}

export async function settleInstallment(input: SettleInstallmentInput) {
  const installment = await prisma.payableInstallment.findUnique({
    where: { id: input.installmentId },
    include: { payable: true },
  });

  if (!installment) {
    throw new PayableError('Parcela não encontrada', 'not_found');
  }
  if (!isOpenInstallmentStatus(installment.status)) {
    throw new PayableError(
      'Parcela não está em aberto para baixa',
      'installment_not_open'
    );
  }
  if (installment.payable.status === 'CANCELED') {
    throw new PayableError('Título cancelado', 'already_canceled');
  }

  const remaining = toNumber(installment.remainingAmount);
  const amount = roundMoney(input.amount ?? remaining);
  if (amount <= 0) {
    throw new PayableError('Valor da baixa deve ser maior que zero', 'invalid_amount');
  }
  if (amount > remaining) {
    throw new PayableError(
      'Valor da baixa excede o saldo da parcela',
      'amount_exceeds_remaining'
    );
  }

  const bankAccount = await prisma.bankAccount.findUnique({
    where: { id: input.bankAccountId },
  });
  if (!bankAccount) {
    throw new PayableError('Conta bancária não encontrada', 'bank_account_not_found');
  }

  if (input.transactionId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
    });
    if (!transaction) {
      throw new PayableError('Transação não encontrada', 'transaction_not_found');
    }

    const existing = await prisma.payableSettlement.findUnique({
      where: { transactionId: input.transactionId },
    });
    if (existing) {
      throw new PayableError(
        'Esta transação já está vinculada a uma baixa',
        'transaction_already_settled'
      );
    }
  }

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.payableSettlement.create({
      data: {
        installmentId: installment.id,
        bankAccountId: input.bankAccountId,
        transactionId: input.transactionId || null,
        amount,
        paidAt: utcDateFromIso(input.paidAt),
        method: input.method ?? installment.paymentMethod,
        notes: input.notes?.trim() || null,
        createdById: input.createdById || null,
        status: 'RECORDED',
      },
    });

    await recalculatePayableTotals(installment.payableId, tx);
    return created;
  });

  if (input.transactionId) {
    await applyCategoryIfEmpty(
      input.transactionId,
      installment.payable.categoryId,
      installment.payable.propertyId,
      installment.payable.description
    );
  }

  const payable = await getPayableById(installment.payableId);
  return { settlement, payable };
}

export async function reverseSettlement(
  settlementId: string,
  params?: { reason?: string | null; reversedById?: string | null }
) {
  const settlement = await prisma.payableSettlement.findUnique({
    where: { id: settlementId },
    include: { installment: true },
  });

  if (!settlement) {
    throw new PayableError('Baixa não encontrada', 'not_found');
  }
  if (settlement.status === 'REVERSED') {
    throw new PayableError('Baixa já estornada', 'already_reversed');
  }

  await prisma.$transaction(async (tx) => {
    await tx.payableSettlement.update({
      where: { id: settlementId },
      data: {
        status: 'REVERSED',
        reversedAt: new Date(),
        reversedById: params?.reversedById || null,
        reverseReason: params?.reason?.trim() || null,
        transactionId: null,
      },
    });

    await recalculatePayableTotals(settlement.installment.payableId, tx);
  });

  return getPayableById(settlement.installment.payableId);
}

export async function getSettlementByTransactionId(transactionId: string) {
  return prisma.payableSettlement.findFirst({
    where: { transactionId, status: 'RECORDED' },
    include: {
      installment: {
        include: {
          payable: {
            include: { vendor: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
}

export async function getSettlementsByTransactionIds(transactionIds: string[]) {
  if (transactionIds.length === 0) return [];
  return prisma.payableSettlement.findMany({
    where: { transactionId: { in: transactionIds }, status: 'RECORDED' },
    select: {
      id: true,
      transactionId: true,
      installmentId: true,
      installment: {
        select: {
          payableId: true,
          payable: { select: { description: true } },
        },
      },
    },
  });
}

export async function suggestInstallmentsForTransaction(params: {
  amount: number;
  date: Date;
  windowDays?: number;
}) {
  const windowDays = params.windowDays ?? 7;
  const absAmount = roundMoney(Math.abs(params.amount));
  const from = new Date(params.date);
  from.setUTCDate(from.getUTCDate() - windowDays);
  const to = new Date(params.date);
  to.setUTCDate(to.getUTCDate() + windowDays);

  const rows = await prisma.payableInstallment.findMany({
    where: {
      status: { in: ['OPEN', 'PARTIALLY_PAID'] },
      remainingAmount: absAmount,
      dueDate: { gte: from, lte: to },
      payable: { status: { not: 'CANCELED' } },
    },
    include: {
      payable: {
        include: {
          vendor: { select: { id: true, name: true } },
          property: { select: { id: true, code: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  });

  if (rows.length > 0) return rows;

  return prisma.payableInstallment.findMany({
    where: {
      status: { in: ['OPEN', 'PARTIALLY_PAID'] },
      remainingAmount: absAmount,
      payable: { status: { not: 'CANCELED' } },
    },
    include: {
      payable: {
        include: {
          vendor: { select: { id: true, name: true } },
          property: { select: { id: true, code: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  });
}

export async function listMatchableDebits(params: {
  amount: number;
  dueDate: Date;
  windowDays?: number;
}) {
  const windowDays = params.windowDays ?? 7;
  const absAmount = roundMoney(Math.abs(params.amount));
  const from = new Date(params.dueDate);
  from.setUTCDate(from.getUTCDate() - windowDays);
  const to = new Date(params.dueDate);
  to.setUTCDate(to.getUTCDate() + windowDays);

  const settledIds = (
    await prisma.payableSettlement.findMany({
      where: { status: 'RECORDED', transactionId: { not: null } },
      select: { transactionId: true },
    })
  )
    .map((row) => row.transactionId)
    .filter((id): id is string => Boolean(id));

  return prisma.transaction.findMany({
    where: {
      amount: new Prisma.Decimal(-absAmount),
      date: { gte: from, lte: to },
      isDuplicate: false,
      ...(settledIds.length > 0 ? { id: { notIn: settledIds } } : {}),
    },
    include: { bankAccount: { select: { id: true, name: true } } },
    orderBy: { date: 'desc' },
    take: 20,
  });
}
