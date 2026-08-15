import type { Prisma } from '@/app/generated/prisma/client';
import type {
  PayableInstallmentStatus,
  PayablePaymentMethod,
  PayableStatus,
} from '@/app/generated/prisma/client';
import { prisma } from './client';
import { PayableError } from '@/lib/core/payables/errors';
import { utcDateFromIso } from '@/lib/core/payables/dates';
import { roundMoney, toNumber } from '@/lib/core/payables/money';
import {
  computeInstallmentStatus,
  computePayableStatus,
  isDueToday,
  isOverdue,
  calendarDate,
} from '@/lib/core/payables/status';

export type PayableInstallmentInput = {
  dueDate: string;
  amount: number;
  paymentMethod?: PayablePaymentMethod;
  boletoLine?: string | null;
  boletoBarcode?: string | null;
};

export type CreatePayableInput = {
  vendorId: string;
  description: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  competenceDate?: string | null;
  categoryId?: string | null;
  propertyId?: string | null;
  notes?: string | null;
  recurrenceId?: string | null;
  createdById?: string | null;
  installments: PayableInstallmentInput[];
};

export type UpdatePayableInput = {
  description?: string;
  documentNumber?: string | null;
  issueDate?: string | null;
  competenceDate?: string | null;
  categoryId?: string | null;
  propertyId?: string | null;
  notes?: string | null;
};

export type ListInstallmentsParams = {
  status?: PayableInstallmentStatus | PayableInstallmentStatus[];
  vendorId?: string;
  propertyId?: string;
  categoryId?: string;
  dueFrom?: string;
  dueTo?: string;
  overdue?: boolean;
  hideCanceled?: boolean;
  search?: string;
};

const payableInclude = {
  vendor: true,
  category: { select: { id: true, name: true } },
  property: { select: { id: true, code: true, city: true } },
  installments: {
    include: {
      settlements: {
        where: { status: 'RECORDED' as const },
        include: {
          bankAccount: { select: { id: true, name: true } },
          transaction: {
            select: { id: true, date: true, description: true, amount: true },
          },
        },
        orderBy: { paidAt: 'desc' as const },
      },
    },
    orderBy: { installmentNumber: 'asc' as const },
  },
  attachments: {
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.PayableInclude;

export type PayableWithRelations = Prisma.PayableGetPayload<{
  include: typeof payableInclude;
}>;

export type InstallmentListItem = {
  id: string;
  payableId: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod: PayablePaymentMethod;
  boletoLine: string | null;
  status: PayableInstallmentStatus;
  isOverdue: boolean;
  isDueToday: boolean;
  payable: {
    id: string;
    description: string;
    status: PayableStatus;
    vendor: { id: string; name: string };
    category: { id: string; name: string } | null;
    property: { id: string; code: string; city: string } | null;
  };
};

function parseOptionalDate(value?: string | null): Date | null {
  if (!value) return null;
  return utcDateFromIso(value);
}

export async function recalculatePayableTotals(
  payableId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) {
  const payable = await db.payable.findUnique({
    where: { id: payableId },
    include: {
      installments: {
        include: {
          settlements: { where: { status: 'RECORDED' } },
        },
      },
    },
  });

  if (!payable) {
    throw new PayableError('Título não encontrado', 'not_found');
  }

  let totalPaid = 0;
  let totalBalance = 0;

  for (const installment of payable.installments) {
    const paidAmount = roundMoney(
      installment.settlements.reduce(
        (sum, settlement) => sum + toNumber(settlement.amount),
        0
      )
    );
    const remainingAmount = Math.max(
      0,
      roundMoney(toNumber(installment.amount) - paidAmount)
    );
    const status = computeInstallmentStatus({
      paidAmount,
      remainingAmount,
      currentStatus: installment.status,
    });

    totalPaid = roundMoney(totalPaid + paidAmount);
    if (installment.status !== 'CANCELED') {
      totalBalance = roundMoney(totalBalance + remainingAmount);
    }

    await db.payableInstallment.update({
      where: { id: installment.id },
      data: {
        paidAmount,
        remainingAmount,
        status,
      },
    });
  }

  const allInstallmentsCanceled =
    payable.installments.length > 0 &&
    payable.installments.every((item) => item.status === 'CANCELED');

  const status = computePayableStatus({
    totalPaidAmount: totalPaid,
    totalBalanceAmount: totalBalance,
    currentStatus: payable.status,
    allInstallmentsCanceled,
  });

  return db.payable.update({
    where: { id: payableId },
    data: {
      totalPaidAmount: totalPaid,
      totalBalanceAmount: totalBalance,
      status,
    },
  });
}

export async function createPayable(input: CreatePayableInput) {
  const description = input.description.trim();
  if (!description) {
    throw new PayableError('Descrição é obrigatória', 'invalid_description');
  }
  if (!input.installments.length) {
    throw new PayableError(
      'Informe ao menos uma parcela',
      'missing_installments'
    );
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
  });
  if (!vendor) {
    throw new PayableError('Fornecedor não encontrado', 'vendor_not_found');
  }

  const installments = input.installments.map((item, index) => {
    const amount = roundMoney(item.amount);
    if (amount <= 0) {
      throw new PayableError(
        `Parcela ${index + 1} deve ter valor maior que zero`,
        'invalid_amount'
      );
    }
    return {
      installmentNumber: index + 1,
      dueDate: utcDateFromIso(item.dueDate),
      amount,
      paidAmount: 0,
      remainingAmount: amount,
      paymentMethod: item.paymentMethod ?? 'BOLETO',
      boletoLine: item.boletoLine?.trim() || null,
      boletoBarcode: item.boletoBarcode?.trim() || null,
    };
  });

  const totalAmount = roundMoney(
    installments.reduce((sum, item) => sum + item.amount, 0)
  );
  const firstDue = installments[0]?.dueDate ?? null;
  const competenceDate =
    parseOptionalDate(input.competenceDate) ??
    (firstDue
      ? new Date(Date.UTC(firstDue.getUTCFullYear(), firstDue.getUTCMonth(), 1))
      : null);

  return prisma.payable.create({
    data: {
      vendorId: input.vendorId,
      description,
      documentNumber: input.documentNumber?.trim() || null,
      issueDate: parseOptionalDate(input.issueDate),
      competenceDate,
      categoryId: input.categoryId || null,
      propertyId: input.propertyId || null,
      notes: input.notes?.trim() || null,
      recurrenceId: input.recurrenceId || null,
      createdById: input.createdById || null,
      totalAmount,
      totalPaidAmount: 0,
      totalBalanceAmount: totalAmount,
      status: 'OPEN',
      installments: { create: installments },
    },
    include: payableInclude,
  });
}

export async function getPayableById(id: string) {
  return prisma.payable.findUnique({
    where: { id },
    include: payableInclude,
  });
}

export async function updatePayable(id: string, input: UpdatePayableInput) {
  const existing = await prisma.payable.findUnique({ where: { id } });
  if (!existing) {
    throw new PayableError('Título não encontrado', 'not_found');
  }
  if (existing.status === 'CANCELED') {
    throw new PayableError(
      'Não é possível editar um título cancelado',
      'already_canceled'
    );
  }

  return prisma.payable.update({
    where: { id },
    data: {
      ...(input.description !== undefined
        ? { description: input.description.trim() }
        : {}),
      ...(input.documentNumber !== undefined
        ? { documentNumber: input.documentNumber?.trim() || null }
        : {}),
      ...(input.issueDate !== undefined
        ? { issueDate: parseOptionalDate(input.issueDate) }
        : {}),
      ...(input.competenceDate !== undefined
        ? { competenceDate: parseOptionalDate(input.competenceDate) }
        : {}),
      ...(input.categoryId !== undefined
        ? { categoryId: input.categoryId || null }
        : {}),
      ...(input.propertyId !== undefined
        ? { propertyId: input.propertyId || null }
        : {}),
      ...(input.notes !== undefined
        ? { notes: input.notes?.trim() || null }
        : {}),
    },
    include: payableInclude,
  });
}

export async function cancelPayable(
  id: string,
  reason?: string | null
) {
  const payable = await prisma.payable.findUnique({
    where: { id },
    include: {
      installments: {
        include: { settlements: { where: { status: 'RECORDED' } } },
      },
    },
  });

  if (!payable) {
    throw new PayableError('Título não encontrado', 'not_found');
  }
  if (payable.status === 'CANCELED') {
    throw new PayableError('Título já está cancelado', 'already_canceled');
  }

  const hasRecorded = payable.installments.some(
    (installment) => installment.settlements.length > 0
  );
  if (hasRecorded) {
    throw new PayableError(
      'Estorne as baixas antes de cancelar o título',
      'has_recorded_settlements'
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.payableInstallment.updateMany({
      where: { payableId: id, status: { not: 'CANCELED' } },
      data: { status: 'CANCELED' },
    });

    return tx.payable.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: reason?.trim() || null,
        totalBalanceAmount: 0,
      },
      include: payableInclude,
    });
  });
}

export async function listInstallments(
  params: ListInstallmentsParams = {}
): Promise<InstallmentListItem[]> {
  const hideCanceled = params.hideCanceled ?? true;
  const where: Prisma.PayableInstallmentWhereInput = {};

  if (params.status) {
    where.status = Array.isArray(params.status)
      ? { in: params.status }
      : params.status;
  } else if (hideCanceled) {
    where.status = { not: 'CANCELED' };
    where.payable = { status: { not: 'CANCELED' } };
  }

  if (params.dueFrom || params.dueTo) {
    where.dueDate = {
      ...(params.dueFrom ? { gte: utcDateFromIso(params.dueFrom) } : {}),
      ...(params.dueTo ? { lte: utcDateFromIso(params.dueTo) } : {}),
    };
  }

  const payableWhere: Prisma.PayableWhereInput = {
    ...(where.payable as Prisma.PayableWhereInput | undefined),
  };
  if (params.vendorId) payableWhere.vendorId = params.vendorId;
  if (params.propertyId) payableWhere.propertyId = params.propertyId;
  if (params.categoryId) payableWhere.categoryId = params.categoryId;
  if (params.search?.trim()) {
    const search = params.search.trim();
    payableWhere.OR = [
      { description: { contains: search } },
      { documentNumber: { contains: search } },
      { vendor: { name: { contains: search } } },
    ];
  }
  if (Object.keys(payableWhere).length > 0) {
    where.payable = payableWhere;
  }

  const rows = await prisma.payableInstallment.findMany({
    where,
    include: {
      payable: {
        include: {
          vendor: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          property: { select: { id: true, code: true, city: true } },
        },
      },
    },
    orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
  });

  const today = calendarDate();
  const mapped = rows.map((row) => {
    const status = row.status;
    return {
      id: row.id,
      payableId: row.payableId,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      amount: toNumber(row.amount),
      paidAmount: toNumber(row.paidAmount),
      remainingAmount: toNumber(row.remainingAmount),
      paymentMethod: row.paymentMethod,
      boletoLine: row.boletoLine,
      status,
      isOverdue: isOverdue(row.dueDate, status, today),
      isDueToday: isDueToday(row.dueDate, status, today),
      payable: {
        id: row.payable.id,
        description: row.payable.description,
        status: row.payable.status,
        vendor: row.payable.vendor,
        category: row.payable.category,
        property: row.payable.property,
      },
    };
  });

  if (params.overdue === true) {
    return mapped.filter((item) => item.isOverdue);
  }
  if (params.overdue === false) {
    return mapped.filter((item) => !item.isOverdue);
  }
  return mapped;
}

export async function getPayableSummary(today: Date = calendarDate()) {
  const startOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
  );
  const endOfMonth = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)
  );
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );

  const openStatuses: PayableInstallmentStatus[] = ['OPEN', 'PARTIALLY_PAID'];

  const [dueThisMonth, overdue, paidThisMonth] = await Promise.all([
    prisma.payableInstallment.aggregate({
      where: {
        status: { in: openStatuses },
        dueDate: { gte: todayUtc, lte: endOfMonth },
        payable: { status: { not: 'CANCELED' } },
      },
      _sum: { remainingAmount: true },
      _count: { _all: true },
    }),
    prisma.payableInstallment.aggregate({
      where: {
        status: { in: openStatuses },
        dueDate: { lt: todayUtc },
        payable: { status: { not: 'CANCELED' } },
      },
      _sum: { remainingAmount: true },
      _count: { _all: true },
    }),
    prisma.payableSettlement.aggregate({
      where: {
        status: 'RECORDED',
        paidAt: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    dueThisMonth: {
      count: dueThisMonth._count._all,
      amount: toNumber(dueThisMonth._sum.remainingAmount),
    },
    overdue: {
      count: overdue._count._all,
      amount: toNumber(overdue._sum.remainingAmount),
    },
    paidThisMonth: {
      count: paidThisMonth._count._all,
      amount: toNumber(paidThisMonth._sum.amount),
    },
  };
}

export async function listAgendaInstallments(from: Date, to: Date) {
  return listInstallments({
    dueFrom: from.toISOString().slice(0, 10),
    dueTo: to.toISOString().slice(0, 10),
    hideCanceled: true,
    status: ['OPEN', 'PARTIALLY_PAID'],
  });
}

export function serializePayable(payable: PayableWithRelations) {
  return {
    ...payable,
    totalAmount: toNumber(payable.totalAmount),
    totalPaidAmount: toNumber(payable.totalPaidAmount),
    totalBalanceAmount: toNumber(payable.totalBalanceAmount),
    installments: payable.installments.map((installment) => ({
      ...installment,
      amount: toNumber(installment.amount),
      paidAmount: toNumber(installment.paidAmount),
      remainingAmount: toNumber(installment.remainingAmount),
      isOverdue: isOverdue(installment.dueDate, installment.status),
      isDueToday: isDueToday(installment.dueDate, installment.status),
      settlements: installment.settlements.map((settlement) => ({
        ...settlement,
        amount: toNumber(settlement.amount),
        transaction: settlement.transaction
          ? {
              ...settlement.transaction,
              amount: toNumber(settlement.transaction.amount),
            }
          : null,
      })),
    })),
  };
}
