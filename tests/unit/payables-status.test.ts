import { describe, expect, it } from 'vitest';
import {
  computeInstallmentStatus,
  computePayableStatus,
  isDueToday,
  isOverdue,
} from '@/lib/core/payables/status';

describe('payable status recalculation', () => {
  it('keeps installment open when nothing is paid', () => {
    expect(
      computeInstallmentStatus({
        paidAmount: 0,
        remainingAmount: 100,
        currentStatus: 'OPEN',
      })
    ).toBe('OPEN');
  });

  it('marks installment as partially paid', () => {
    expect(
      computeInstallmentStatus({
        paidAmount: 40,
        remainingAmount: 60,
        currentStatus: 'OPEN',
      })
    ).toBe('PARTIALLY_PAID');
  });

  it('marks installment as paid when remaining is zero', () => {
    expect(
      computeInstallmentStatus({
        paidAmount: 100,
        remainingAmount: 0,
        currentStatus: 'PARTIALLY_PAID',
      })
    ).toBe('PAID');
  });

  it('keeps canceled installment canceled after a reverse', () => {
    expect(
      computeInstallmentStatus({
        paidAmount: 0,
        remainingAmount: 100,
        currentStatus: 'CANCELED',
      })
    ).toBe('CANCELED');
  });

  it('marks payable as partially paid then paid then open after reverse', () => {
    expect(
      computePayableStatus({
        totalPaidAmount: 50,
        totalBalanceAmount: 50,
        currentStatus: 'OPEN',
        allInstallmentsCanceled: false,
      })
    ).toBe('PARTIALLY_PAID');

    expect(
      computePayableStatus({
        totalPaidAmount: 100,
        totalBalanceAmount: 0,
        currentStatus: 'PARTIALLY_PAID',
        allInstallmentsCanceled: false,
      })
    ).toBe('PAID');

    expect(
      computePayableStatus({
        totalPaidAmount: 0,
        totalBalanceAmount: 100,
        currentStatus: 'PAID',
        allInstallmentsCanceled: false,
      })
    ).toBe('OPEN');
  });

  it('keeps canceled payables canceled', () => {
    expect(
      computePayableStatus({
        totalPaidAmount: 0,
        totalBalanceAmount: 0,
        currentStatus: 'CANCELED',
        allInstallmentsCanceled: true,
      })
    ).toBe('CANCELED');
  });
});

describe('overdue derived from due date', () => {
  const today = new Date('2026-08-14T12:00:00.000Z');

  it('flags open installment with past due date as overdue', () => {
    expect(
      isOverdue(new Date('2026-08-01T00:00:00.000Z'), 'OPEN', today)
    ).toBe(true);
  });

  it('does not flag paid installment as overdue', () => {
    expect(
      isOverdue(new Date('2026-08-01T00:00:00.000Z'), 'PAID', today)
    ).toBe(false);
  });

  it('flags due today without marking overdue', () => {
    const due = new Date('2026-08-14T00:00:00.000Z');
    expect(isDueToday(due, 'OPEN', today)).toBe(true);
    expect(isOverdue(due, 'OPEN', today)).toBe(false);
  });
});
