import type {
  PayableInstallmentStatus,
  PayableStatus,
} from '@/app/generated/prisma/client';
import { roundMoney } from './money';

export function computeInstallmentStatus(params: {
  paidAmount: number;
  remainingAmount: number;
  currentStatus: PayableInstallmentStatus;
}): PayableInstallmentStatus {
  if (params.currentStatus === 'CANCELED') return 'CANCELED';
  if (roundMoney(params.remainingAmount) <= 0) return 'PAID';
  if (roundMoney(params.paidAmount) > 0) return 'PARTIALLY_PAID';
  return 'OPEN';
}

export function computePayableStatus(params: {
  totalPaidAmount: number;
  totalBalanceAmount: number;
  currentStatus: PayableStatus;
  allInstallmentsCanceled: boolean;
}): PayableStatus {
  if (params.currentStatus === 'CANCELED' || params.allInstallmentsCanceled) {
    return 'CANCELED';
  }
  if (roundMoney(params.totalBalanceAmount) <= 0) return 'PAID';
  if (roundMoney(params.totalPaidAmount) > 0) return 'PARTIALLY_PAID';
  return 'OPEN';
}

export function isOpenInstallmentStatus(
  status: PayableInstallmentStatus
): boolean {
  return status === 'OPEN' || status === 'PARTIALLY_PAID';
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function calendarDate(date: Date = new Date()): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
}

export function isOverdue(
  dueDate: Date,
  status: PayableInstallmentStatus,
  today: Date = calendarDate()
): boolean {
  if (!isOpenInstallmentStatus(status)) return false;
  return startOfUtcDay(dueDate) < startOfUtcDay(today);
}

export function isDueToday(
  dueDate: Date,
  status: PayableInstallmentStatus,
  today: Date = calendarDate()
): boolean {
  if (!isOpenInstallmentStatus(status)) return false;
  return startOfUtcDay(dueDate).getTime() === startOfUtcDay(today).getTime();
}
