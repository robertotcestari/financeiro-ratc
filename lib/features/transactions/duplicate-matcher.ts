import type { Transaction } from '@/app/generated/prisma';

export interface DuplicateMatchInput {
  /**
   * Optional external transaction ID (e.g. OFX transaction id).
   * When present, can be used for exact matches.
   */
  transactionId?: string | null;
  date: Date;
  amount: number;
  description: string;
}

export interface DuplicateMatchResult<TIncoming extends DuplicateMatchInput> {
  incoming: TIncoming;
  existing: Transaction;
  confidence: number;
  matchCriteria: string[];
  isExactMatch: boolean;
}

export interface DuplicateMatcherOptions {
  /**
   * Inclusive date tolerance in days.
   */
  dateToleranceDays: number;
  /**
   * Amount tolerance in currency units (e.g. 0.01).
   */
  amountTolerance: number;
}

function toCents(value: number): number {
  // avoid float drift by rounding to cents
  return Math.round(Math.abs(value) * 100);
}

function buildAmountIndex<T>(
  items: T[],
  getAmount: (t: T) => number
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const key = toCents(getAmount(item));
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return map;
}

function daysDiff(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return maxLength > 0 ? 1 - distance / maxLength : 0;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function getMatchCriteria(
  incoming: DuplicateMatchInput,
  existing: Transaction,
  opts: DuplicateMatcherOptions
): string[] {
  const criteria: string[] = [];

  const d = daysDiff(incoming.date, existing.date);
  if (d === 0) {
    criteria.push('exact_date');
  } else if (d <= opts.dateToleranceDays) {
    criteria.push('similar_date');
  }

  const incomingAmount = incoming.amount;
  const existingAmount = Number(existing.amount);
  if (
    Math.abs(Math.abs(incomingAmount) - Math.abs(existingAmount)) <=
    opts.amountTolerance
  ) {
    criteria.push('exact_amount');
  }

  const sim = calculateStringSimilarity(
    incoming.description,
    existing.description
  );
  if (sim >= 0.9) {
    criteria.push('exact_description');
  } else if (sim >= 0.7) {
    criteria.push('similar_description');
  }

  return criteria;
}

function calculateConfidence(
  incoming: DuplicateMatchInput,
  existing: Transaction,
  opts: DuplicateMatcherOptions
): number {
  let score = 0;
  let maxScore = 0;

  // Date (30%)
  const dateWeight = 0.3;
  const d = daysDiff(incoming.date, existing.date);
  if (d === 0) score += dateWeight;
  else if (d <= 1) score += dateWeight * 0.8;
  else if (d <= opts.dateToleranceDays) score += dateWeight * 0.6;
  maxScore += dateWeight;

  // Amount (40%) - compare magnitude
  const amountWeight = 0.4;
  const incomingAmount = incoming.amount;
  const existingAmount = Number(existing.amount);
  if (
    Math.abs(Math.abs(incomingAmount) - Math.abs(existingAmount)) <=
    opts.amountTolerance
  ) {
    score += amountWeight;
  }
  maxScore += amountWeight;

  // Description (30%)
  const descWeight = 0.3;
  const sim = calculateStringSimilarity(
    incoming.description,
    existing.description
  );
  score += sim * descWeight;
  maxScore += descWeight;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Build a fast in-memory matcher to compare incoming transactions to existing ones.
 *
 * Strategy:
 * - Index existing transactions by absolute amount in cents.
 * - For each incoming tx, only compare to candidates with same cents (±1 cent).
 */
export function matchIncomingToExisting<
  TIncoming extends DuplicateMatchInput,
>(params: {
  incoming: TIncoming[];
  existing: Transaction[];
  options: DuplicateMatcherOptions;
}): Array<DuplicateMatchResult<TIncoming>> {
  const { incoming, existing, options } = params;
  const index = buildAmountIndex(existing, (t) =>
    Number((t as Transaction).amount)
  );

  const matches: Array<DuplicateMatchResult<TIncoming>> = [];
  const tolDays = options.dateToleranceDays;

  for (const tx of incoming) {
    const key = toCents(tx.amount);
    const candidates: Transaction[] = [];
    for (const k of [key - 1, key, key + 1]) {
      const bucket = index.get(k);
      if (bucket) candidates.push(...bucket);
    }

    for (const existingTx of candidates) {
      const d = daysDiff(tx.date, existingTx.date);
      if (d > tolDays) continue;

      const confidence = calculateConfidence(tx, existingTx, options);
      const criteria = getMatchCriteria(tx, existingTx, options);

      matches.push({
        incoming: tx,
        existing: existingTx,
        confidence,
        matchCriteria: criteria,
        isExactMatch: false,
      });
    }
  }

  return matches;
}

export function getStringSimilarity(str1: string, str2: string): number {
  return calculateStringSimilarity(str1, str2);
}
