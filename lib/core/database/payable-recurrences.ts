import type {
  PayablePaymentMethod,
  PayableRecurrenceFrequency,
} from '@/app/generated/prisma/client';
import { prisma } from './client';
import { createPayable } from './payables';
import { PayableError } from '@/lib/core/payables/errors';
import {
  competenceDateFor,
  dueDateForRecurrence,
  isoDate,
  nextRunAfter,
  utcDateFromIso,
} from '@/lib/core/payables/dates';
import { roundMoney, toNumber } from '@/lib/core/payables/money';

export type RecurrenceInput = {
  vendorId: string;
  description: string;
  categoryId?: string | null;
  propertyId?: string | null;
  amount: number;
  paymentMethod?: PayablePaymentMethod;
  frequency?: PayableRecurrenceFrequency;
  dayOfMonth: number;
  startDate: string;
  endDate?: string | null;
  isActive?: boolean;
};

export async function listRecurrences() {
  const rows = await prisma.payableRecurrence.findMany({
    include: {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      property: { select: { id: true, code: true } },
    },
    orderBy: [{ isActive: 'desc' }, { description: 'asc' }],
  });

  return rows.map((row) => ({
    ...row,
    amount: toNumber(row.amount),
  }));
}

export async function getRecurrenceById(id: string) {
  const row = await prisma.payableRecurrence.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      property: { select: { id: true, code: true } },
    },
  });
  if (!row) return null;
  return { ...row, amount: toNumber(row.amount) };
}

export async function createRecurrence(input: RecurrenceInput) {
  const description = input.description.trim();
  if (!description) {
    throw new PayableError('Descrição é obrigatória', 'invalid_description');
  }
  const amount = roundMoney(input.amount);
  if (amount <= 0) {
    throw new PayableError('Valor deve ser maior que zero', 'invalid_amount');
  }
  if (input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    throw new PayableError('Dia do mês inválido', 'invalid_day');
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: input.vendorId },
  });
  if (!vendor) {
    throw new PayableError('Fornecedor não encontrado', 'vendor_not_found');
  }

  const startDate = utcDateFromIso(input.startDate);

  return prisma.payableRecurrence.create({
    data: {
      vendorId: input.vendorId,
      description,
      categoryId: input.categoryId || null,
      propertyId: input.propertyId || null,
      amount,
      paymentMethod: input.paymentMethod ?? 'BOLETO',
      frequency: input.frequency ?? 'MONTHLY',
      dayOfMonth: input.dayOfMonth,
      startDate,
      endDate: input.endDate ? utcDateFromIso(input.endDate) : null,
      nextRunDate: startDate,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateRecurrence(id: string, input: RecurrenceInput) {
  const existing = await prisma.payableRecurrence.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PayableError('Recorrência não encontrada', 'not_found');
  }

  const description = input.description.trim();
  const amount = roundMoney(input.amount);
  if (amount <= 0) {
    throw new PayableError('Valor deve ser maior que zero', 'invalid_amount');
  }

  return prisma.payableRecurrence.update({
    where: { id },
    data: {
      vendorId: input.vendorId,
      description,
      categoryId: input.categoryId || null,
      propertyId: input.propertyId || null,
      amount,
      paymentMethod: input.paymentMethod ?? existing.paymentMethod,
      frequency: input.frequency ?? existing.frequency,
      dayOfMonth: input.dayOfMonth,
      startDate: utcDateFromIso(input.startDate),
      endDate: input.endDate ? utcDateFromIso(input.endDate) : null,
      isActive: input.isActive ?? existing.isActive,
    },
  });
}

export async function setRecurrenceActive(id: string, isActive: boolean) {
  const existing = await prisma.payableRecurrence.findUnique({
    where: { id },
  });
  if (!existing) {
    throw new PayableError('Recorrência não encontrada', 'not_found');
  }

  return prisma.payableRecurrence.update({
    where: { id },
    data: { isActive },
  });
}

export async function generateRecurrenceForPeriod(
  recurrenceId: string,
  year: number,
  month: number
) {
  const recurrence = await prisma.payableRecurrence.findUnique({
    where: { id: recurrenceId },
  });
  if (!recurrence) {
    throw new PayableError('Recorrência não encontrada', 'not_found');
  }
  if (!recurrence.isActive) {
    throw new PayableError('Recorrência inativa', 'inactive');
  }

  const competenceDate = competenceDateFor(year, month);
  const dueDate = dueDateForRecurrence(year, month, recurrence.dayOfMonth);

  if (dueDate < recurrence.startDate) {
    return { created: false, payable: null as null };
  }
  if (recurrence.endDate && dueDate > recurrence.endDate) {
    return { created: false, payable: null as null };
  }

  const existing = await prisma.payable.findFirst({
    where: {
      recurrenceId,
      competenceDate,
      status: { not: 'CANCELED' },
    },
  });
  if (existing) {
    return { created: false, payable: existing };
  }

  const payable = await createPayable({
    vendorId: recurrence.vendorId,
    description: recurrence.description,
    categoryId: recurrence.categoryId,
    propertyId: recurrence.propertyId,
    competenceDate: isoDate(competenceDate),
    recurrenceId: recurrence.id,
    installments: [
      {
        dueDate: isoDate(dueDate),
        amount: toNumber(recurrence.amount),
        paymentMethod: recurrence.paymentMethod,
      },
    ],
  });

  const nextRunDate = nextRunAfter(dueDate, recurrence.frequency);
  await prisma.payableRecurrence.update({
    where: { id: recurrence.id },
    data: { nextRunDate },
  });

  return { created: true, payable };
}

export async function generateDueRecurrences(reference: Date = new Date()) {
  const recurrences = await prisma.payableRecurrence.findMany({
    where: { isActive: true },
  });

  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;

  const created = [];
  for (const recurrence of recurrences) {
    const current = await generateRecurrenceForPeriod(
      recurrence.id,
      year,
      month
    );
    if (current.created) created.push(current.payable);

    const upcoming = await generateRecurrenceForPeriod(
      recurrence.id,
      nextYear,
      nextMonth
    );
    if (upcoming.created) created.push(upcoming.payable);
  }

  return created;
}
