import { prisma } from './client';
import type {
  ProcessedTransaction,
  Transaction,
  CategorizationRule,
} from '@/app/generated/prisma';

import {
  RuleCriteria,
  validateRuleCriteria,
  prepareKeywords,
  containsSubstring,
  containsWholeWord,
} from './rule-types';
import { isDateInDayRange, isDateInMonths } from '@/lib/utils/date-helpers';

import {
  setBestSuggestionForTransaction,
  upsertSuggestion,
} from './suggestions';

/**
 * Internal evaluated result used before persisting suggestions.
 */
interface EvaluatedSuggestion {
  processedTransactionId: string;
  ruleId: string;
  suggestedCategoryId: string | null;
  suggestedPropertyId: string | null;
  confidence: number; // 0.0..1.0
}

type PTxWithTx = ProcessedTransaction & {
  transaction: Transaction | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// =============== Criteria Evaluation Helpers ===============

/**
 * Returns [matched, scoreOrNull], where score is considered when matched.
 */
function evaluateAccountCriteria(
  tx: PTxWithTx,
  criteria?: RuleCriteria['accounts']
): [boolean, number | null] {
  if (!criteria || criteria.length === 0) return [true, null];
  const baId = tx.transaction?.bankAccountId;
  if (!baId) return [false, null];
  const matched = criteria.includes(baId);
  return [matched, matched ? 1.0 : null];
}

function evaluateDateCriteria(
  tx: PTxWithTx,
  dateCriteria?: RuleCriteria['date']
): [boolean, number | null] {
  if (!dateCriteria) return [true, null];
  if (!tx.transaction?.date) return [false, null];

  const d = tx.transaction.date;

  // Track whether at least one date constraint was provided
  let anyProvided = false;

  // Day range (inclusive)
  if (dateCriteria.dayRange) {
    anyProvided = true;
    if (!isDateInDayRange(d, dateCriteria.dayRange)) {
      return [false, null];
    }
  }

  // Months (1..12)
  if (dateCriteria.months && dateCriteria.months.length > 0) {
    anyProvided = true;
    if (!isDateInMonths(d, dateCriteria.months)) {
      return [false, null];
    }
  }

  // Only award a score when at least one date constraint was provided and matched
  return [true, anyProvided ? 0.7 : null];
}

function absAmount(tx: PTxWithTx): number | null {
  const amt = tx.transaction?.amount;
  if (amt == null) return null;
  return Math.abs(Number(amt));
}

function evaluateValueCriteria(
  tx: PTxWithTx,
  valueCriteria?: RuleCriteria['value']
): [boolean, number | null] {
  if (!valueCriteria) return [true, null];
  const a = absAmount(tx);
  if (a == null) return [false, null];

  const { min, max, operator } = valueCriteria;

  let matched = true;
  if (operator) {
    switch (operator) {
      case 'gt':
        matched = a > (min ?? Number.NEGATIVE_INFINITY);
        break;
      case 'gte':
        matched = a >= (min ?? Number.NEGATIVE_INFINITY);
        break;
      case 'lt':
        matched = a < (max ?? Number.POSITIVE_INFINITY);
        break;
      case 'lte':
        matched = a <= (max ?? Number.POSITIVE_INFINITY);
        break;
      case 'eq':
        matched = min != null ? Math.abs(a - min) < 0.00001 : false;
        break;
      case 'between':
        matched = min != null && max != null ? a >= min && a <= max : false;
        break;
      default:
        matched = true;
    }
  } else {
    // Fallback: use min/max if provided
    if (min != null && a < min) matched = false;
    if (max != null && a > max) matched = false;
  }

  return [matched, matched ? 0.9 : null];
}

function evaluateDescriptionCriteria(
  tx: PTxWithTx,
  descCriteria?: RuleCriteria['description']
): [boolean, number | null] {
  if (!descCriteria) return [true, null];
  const desc = tx.transaction?.description ?? '';
  if (desc.length === 0) return [false, null];

  const { keywords, operator, caseSensitive } = descCriteria;
  const prepared = prepareKeywords(keywords, caseSensitive);

  if (prepared.length === 0) return [false, null];

  // For matching we use substring contains.
  // We also check for whole-word matches to compute higher confidence.
  const perKeyword = prepared.map((k) => {
    const hasWhole = containsWholeWord(desc, k, !!caseSensitive);
    const hasSub = hasWhole
      ? true
      : containsSubstring(desc, k, !!caseSensitive);
    return { hasSub, hasWhole };
  });

  let matched = false;
  if (operator === 'and') {
    matched = perKeyword.every((r) => r.hasSub);
  } else {
    matched = perKeyword.some((r) => r.hasSub);
  }

  if (!matched) return [false, null];

  // Confidence: exact keyword (whole-word) 1.0, partial 0.8
  const anyWhole = perKeyword.some((r) => r.hasWhole);
  const score = anyWhole ? 1.0 : 0.8;
  return [true, score];
}

function computeOverallConfidence(scores: Array<number | null>): number {
  const present = scores.filter((s): s is number => typeof s === 'number');
  if (present.length === 0) {
    // When no criteria provided, we consider not eligible for suggestion
    return 0.0;
  }
  const sum = present.reduce((a, b) => a + b, 0);
  return Math.max(0, Math.min(1, sum / present.length));
}

function parseCriteria(rule: CategorizationRule): RuleCriteria | null {
  // rule.criteria is Prisma Json. We trust runtime shape but validate lightly.
  const raw = (rule as unknown as { criteria: unknown }).criteria as
    | RuleCriteria
    | undefined;
  if (!raw || typeof raw !== 'object') return null;
  const { valid } = validateRuleCriteria(raw as RuleCriteria);
  return valid ? (raw as RuleCriteria) : null;
}

function hasTarget(rule: CategorizationRule): boolean {
  return !!(rule.categoryId ?? rule.propertyId);
}

// =============== Rule Engine ===============

export class RuleEngine {
  /**
   * Evaluate a single processed transaction against a set of rules.
   * Returns at most one suggestion (the best by priority/recency) if matched.
   */
  async evaluateTransaction(
    tx: PTxWithTx,
    rules: CategorizationRule[]
  ): Promise<EvaluatedSuggestion[]> {
    if (!tx.transaction) return [];

    // Filter to valid, active rules with targets
    const activeRules = rules.filter((r) => r.isActive && hasTarget(r));
    if (activeRules.length === 0) return [];

    // Evaluate each rule; keep matches
    const matches: Array<{
      rule: CategorizationRule;
      confidence: number;
    }> = [];

    for (const rule of activeRules) {
      const criteria = parseCriteria(rule);
      if (!criteria) continue;

      // Accounts first (cheap)
      const [accOk, accScore] = evaluateAccountCriteria(tx, criteria.accounts);
      if (!accOk) continue;

      const [valOk, valScore] = evaluateValueCriteria(tx, criteria.value);
      if (!valOk) continue;

      const [dateOk, dateScore] = evaluateDateCriteria(tx, criteria.date);
      if (!dateOk) continue;

      const [descOk, descScore] = evaluateDescriptionCriteria(
        tx,
        criteria.description
      );
      if (!descOk) continue;

      const confidence = computeOverallConfidence([
        accScore,
        valScore,
        dateScore,
        descScore,
      ]);

      if (confidence > 0) {
        matches.push({ rule, confidence });
      }
    }

    if (matches.length === 0) return [];

    // Priority resolution:
    // 1) highest priority number
    // 2) if tie, most recently created
    matches.sort((a, b) => {
      if (b.rule.priority !== a.rule.priority) {
        return b.rule.priority - a.rule.priority;
      }
      const at = (a.rule.createdAt as unknown as Date) ?? new Date(0);
      const bt = (b.rule.createdAt as unknown as Date) ?? new Date(0);
      return bt.getTime() - at.getTime();
    });

    const winner = matches[0];
    return [
      {
        processedTransactionId: tx.id,
        ruleId: winner.rule.id,
        suggestedCategoryId: winner.rule.categoryId ?? null,
        suggestedPropertyId: winner.rule.propertyId ?? null,
        confidence: winner.confidence,
      },
    ];
  }

  /**
   * Generate suggestions for multiple transactions (best single suggestion per transaction).
   * - Loads active rules (optionally filtered by ruleIds)
   * - Evaluates in batches
   * - Persists only the best suggestion per transaction (replaces non-applied ones)
   */
  async generateSuggestions(
    processedTransactionIds: string[],
    ruleIds?: string[]
  ): Promise<{
    processed: number;
    suggested: number;
  }> {
    if (processedTransactionIds.length === 0) {
      return { processed: 0, suggested: 0 };
    }

    const rules = await prisma.categorizationRule.findMany({
      where: {
        isActive: true,
        ...(ruleIds && ruleIds.length > 0 ? { id: { in: ruleIds } } : {}),
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    if (rules.length === 0) return { processed: 0, suggested: 0 };

    const idBatches = chunk(processedTransactionIds, 100);
    let processed = 0;
    let suggested = 0;

    for (const ids of idBatches) {
      const txs = await prisma.processedTransaction.findMany({
        where: { id: { in: ids } },
        include: { transaction: true },
      });

      for (const tx of txs) {
        processed += 1;

        try {
          const evaluated = await this.evaluateTransaction(
            tx as PTxWithTx,
            rules
          );
          if (evaluated.length === 0) {
            // No match; we do not delete existing suggestions here (only setBestSuggestion does for matched).
            continue;
          }

          const best = evaluated[0];
          const created = await setBestSuggestionForTransaction({
            processedTransactionId: best.processedTransactionId,
            ruleId: best.ruleId,
            suggestedCategoryId: best.suggestedCategoryId ?? null,
            suggestedPropertyId: best.suggestedPropertyId ?? null,
            confidence: best.confidence,
          });

          if (created) suggested += 1;
        } catch {
          // Partial failure: continue with others
          // Optional: log error
        }
      }
    }

    return { processed, suggested };
  }

  /**
   * Apply a specific rule to a specific set of transactions (does not remove other suggestions).
   * - For each tx, if criteria match, upsert a suggestion for this (tx, rule) pair.
   */
  async applyRuleToTransactions(
    ruleId: string,
    processedTransactionIds: string[]
  ): Promise<
    Array<{
      processedTransactionId: string;
      success: boolean;
      matched: boolean;
      suggestionCreated: boolean;
      error?: string;
    }>
  > {
    const out: Array<{
      processedTransactionId: string;
      success: boolean;
      matched: boolean;
      suggestionCreated: boolean;
      error?: string;
    }> = [];

    const rule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule || !rule.isActive || !hasTarget(rule)) {
      // If rule unavailable, mark all as failed in a consistent way
      return processedTransactionIds.map((id) => ({
        processedTransactionId: id,
        success: false,
        matched: false,
        suggestionCreated: false,
        error: 'Rule not found or inactive or has no target',
      }));
    }

    const criteria = parseCriteria(rule);
    if (!criteria) {
      return processedTransactionIds.map((id) => ({
        processedTransactionId: id,
        success: false,
        matched: false,
        suggestionCreated: false,
        error: 'Invalid rule criteria',
      }));
    }

    const idBatches = chunk(processedTransactionIds, 100);

    for (const ids of idBatches) {
      const txs = await prisma.processedTransaction.findMany({
        where: { id: { in: ids } },
        include: { transaction: true },
      });

      for (const tx of txs) {
        try {
          if (!tx.transaction) {
            out.push({
              processedTransactionId: tx.id,
              success: false,
              matched: false,
              suggestionCreated: false,
              error: 'Missing linked Transaction',
            });
            continue;
          }

          // Evaluate this single rule against tx
          const [accOk] = evaluateAccountCriteria(
            tx as PTxWithTx,
            criteria.accounts
          );
          if (!accOk) {
            out.push({
              processedTransactionId: tx.id,
              success: true,
              matched: false,
              suggestionCreated: false,
            });
            continue;
          }

          const [valOk] = evaluateValueCriteria(
            tx as PTxWithTx,
            criteria.value
          );
          if (!valOk) {
            out.push({
              processedTransactionId: tx.id,
              success: true,
              matched: false,
              suggestionCreated: false,
            });
            continue;
          }

          const [dateOk] = evaluateDateCriteria(tx as PTxWithTx, criteria.date);
          if (!dateOk) {
            out.push({
              processedTransactionId: tx.id,
              success: true,
              matched: false,
              suggestionCreated: false,
            });
            continue;
          }

          const [descOk, descScore] = evaluateDescriptionCriteria(
            tx as PTxWithTx,
            criteria.description
          );
          if (!descOk) {
            out.push({
              processedTransactionId: tx.id,
              success: true,
              matched: false,
              suggestionCreated: false,
            });
            continue;
          }

          // Compute confidence (accounts and value/date considered best-effort default scores)
          const confidence = computeOverallConfidence([
            1.0, // accounts matched
            0.9, // value matched (if no value criteria exists, evaluateValueCriteria returns null - but we forced it)
            0.7, // date matched
            descScore ?? 0.8, // description matched
          ]);

          await upsertSuggestion({
            processedTransactionId: tx.id,
            ruleId: rule.id,
            suggestedCategoryId: rule.categoryId ?? null,
            suggestedPropertyId: rule.propertyId ?? null,
            confidence,
          });

          out.push({
            processedTransactionId: tx.id,
            success: true,
            matched: true,
            suggestionCreated: true,
          });
        } catch (e) {
          out.push({
            processedTransactionId: tx.id,
            success: false,
            matched: false,
            suggestionCreated: false,
            error: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      }
    }

    return out;
  }
}

// Optional: shared instance
export const ruleEngine = new RuleEngine();
