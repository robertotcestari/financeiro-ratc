import { format, isWithinInterval } from 'date-fns';

export interface DayRange {
  start: number; // 1..31 inclusive
  end: number; // 1..31 inclusive
}

/**
 * Returns true when the UTC day-of-month of the given date falls within [start, end] inclusive.
 * Assumes start <= end (validated elsewhere).
 */
export function isDateInDayRange(date: Date, range: DayRange): boolean {
  const day = date.getUTCDate();
  return day >= range.start && day <= range.end;
}

/**
 * Check if date month (UTC) is one of the provided months (1..12).
 */
export function isDateInMonths(date: Date, months: number[]): boolean {
  if (!months || months.length === 0) return true;
  const month = date.getUTCMonth() + 1; // 1..12
  return months.includes(month);
}

/**
 * Inclusive date range check using date-fns.
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  // isWithinInterval is inclusive by design for start and end
  return isWithinInterval(date, { start, end });
}

/**
 * Format a transaction date for display (Brazil format dd/MM/yyyy).
 * Uses local timezone when formatting.
 */
export function formatTransactionDate(date: Date): string {
  return format(date, 'dd/MM/yyyy');
}
