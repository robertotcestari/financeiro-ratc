import type { PayableRecurrenceFrequency } from '@/app/generated/prisma';

export function competenceDateFor(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function dueDateForRecurrence(
  year: number,
  month: number,
  dayOfMonth: number
): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(Math.max(dayOfMonth, 1), lastDay);
  return new Date(Date.UTC(year, month - 1, day));
}

export function nextRunAfter(
  current: Date,
  frequency: PayableRecurrenceFrequency
): Date {
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const day = current.getUTCDate();

  if (frequency === 'YEARLY') {
    return dueDateForRecurrence(year + 1, month + 1, day);
  }

  const nextMonthIndex = month + 1;
  const nextYear = year + Math.floor(nextMonthIndex / 12);
  const nextMonth = (nextMonthIndex % 12) + 1;
  return dueDateForRecurrence(nextYear, nextMonth, day);
}

export function utcDateFromIso(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
