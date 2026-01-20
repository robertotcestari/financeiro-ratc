import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1) Pure utilities (date-helpers, rule-types)

// date-helpers is pure and can be imported directly
import {
  isDateInDayRange,
  isDateInMonths,
  isDateInRange,
  formatTransactionDate,
} from '@/lib/utils/date-helpers';

// rule-types utilities are pure as well
import {
  validateRuleCriteria,
  prepareKeywords,
  containsWholeWord,
  containsSubstring,
  type RuleCriteria,
} from '@/lib/core/database/rule-types';
// Prisma types for strong typing of stubs
import { Prisma } from '@/app/generated/prisma';
import type {
  ProcessedTransaction as PTx,
  Transaction as Tx,
  CategorizationRule,
  Prisma as PrismaTypes,
} from '@/app/generated/prisma';

import { prisma } from '@/lib/core/database/client';

type PTxWithTx = PTx & { transaction: Tx | null };

// 2) Modules that import prisma client: we must mock prisma module BEFORE importing them

// IMPORTANT: mock the prisma client module used by DB-layer files
vi.mock('@/lib/core/database/client', () => {
  const txMocks = {
    transactionSuggestion: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    processedTransaction: {
      update: vi.fn(),
    },
  };

  const prismaMocks = {
    transactionSuggestion: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    processedTransaction: {
      update: vi.fn(),
    },
    categorizationRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (cb: (txArg: typeof txMocks) => unknown) =>
      cb(txMocks)
    ),
  };

  return { prisma: prismaMocks };
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

// Now we can import modules that reference prisma
import { ruleEngine } from '@/lib/core/database/rule-engine';
import {
  setBestSuggestionForTransaction,
  upsertSuggestion,
  applySuggestion,
  applySuggestions,
  dismissSuggestion,
} from '@/lib/core/database/suggestions';

// ---------------------------
// Section 1: date-helpers
// ---------------------------
describe('date-helpers', () => {
  it('isDateInDayRange() returns true for inclusive boundaries', () => {
    const d = new Date(Date.UTC(2025, 0, 15)); // 15 Jan 2025
    expect(isDateInDayRange(d, { start: 1, end: 15 })).toBe(true);
    expect(isDateInDayRange(d, { start: 15, end: 15 })).toBe(true);
    expect(isDateInDayRange(d, { start: 16, end: 20 })).toBe(false);
  });

  it('isDateInMonths() checks UTC month membership', () => {
    const d = new Date(Date.UTC(2025, 6, 10)); // July (7)
    expect(isDateInMonths(d, [1, 7, 12])).toBe(true);
    expect(isDateInMonths(d, [2, 3])).toBe(false);
  });

  it('isDateInRange() is inclusive with date-fns', () => {
    const start = new Date(Date.UTC(2025, 0, 1));
    const end = new Date(Date.UTC(2025, 0, 31));
    expect(isDateInRange(new Date(Date.UTC(2025, 0, 1)), start, end)).toBe(
      true
    );
    expect(isDateInRange(new Date(Date.UTC(2025, 0, 31)), start, end)).toBe(
      true
    );
    expect(isDateInRange(new Date(Date.UTC(2025, 1, 1)), start, end)).toBe(
      false
    );
  });

  it('formatTransactionDate() formats as dd/MM/yyyy', () => {
    const d = new Date(Date.UTC(2025, 1, 5, 12, 0, 0)); // 05/02/2025
    expect(formatTransactionDate(d)).toBe('05/02/2025');
  });
});

// ---------------------------
// Section 2: rule-types utilities
// ---------------------------
describe('rule-types utilities', () => {
  it('validateRuleCriteria() accepts valid criteria and rejects invalid ones', () => {
    const valid: RuleCriteria = {
      date: { dayRange: { start: 1, end: 15 }, months: [1, 6, 12] },
      value: { min: 100, max: 500, operator: 'between' },
      description: { keywords: ['ALUGUEL', 'CASA'], operator: 'and' },
      accounts: ['acc-1', 'acc-2'],
    };
    expect(validateRuleCriteria(valid).valid).toBe(true);

    const invalidMonths: RuleCriteria = { date: { months: [0, 13] } };
    expect(validateRuleCriteria(invalidMonths).valid).toBe(false);

    const invalidBetween: RuleCriteria = {
      value: { min: 600, max: 500, operator: 'between' },
    };
    expect(validateRuleCriteria(invalidBetween).valid).toBe(false);

    const invalidKeywords: RuleCriteria = {
      description: { keywords: ['  ', ''], operator: 'or' },
    };
    expect(validateRuleCriteria(invalidKeywords).valid).toBe(false);
  });

  it('prepareKeywords() lowercases when caseSensitive=false', () => {
    expect(prepareKeywords([' AluGuEl '], false)).toEqual(['aluguel']);
    expect(prepareKeywords(['TEST'], true)).toEqual(['TEST']);
  });

  it('containsWholeWord() vs containsSubstring()', () => {
    const text = 'PAGAMENTO DE ALUGUEL CASA CENTRO';
    expect(containsWholeWord(text, 'ALUGUEL')).toBe(true);
    expect(containsWholeWord(text, 'ALU')).toBe(false);
    expect(containsSubstring(text, 'LUGU')).toBe(true);
  });
});

// ---------------------------
// Section 3: RuleEngine.evaluateTransaction (no DB)
// ---------------------------
describe('RuleEngine.evaluateTransaction', () => {
  function makeTx({
    id = 'ptx-1',
    bankAccountId = 'acc-1',
    date = new Date(Date.UTC(2025, 0, 10)),
    amount = -1200.0,
    description = 'ALUGUEL CASA CENTRO',
  } = {}): PTxWithTx {
    const txId = 't-1';
    const ptx: PTxWithTx = {
      id,
      transactionId: txId,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      categoryId: null,
      propertyId: null,
      details: null,
      notes: null,
      isReviewed: false,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      transaction: {
        id: txId,
        bankAccountId,
        date,
        amount: new Prisma.Decimal(amount),
        description,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
      },
    };
    return ptx;
  }

  function makeRule({
    id = 'rule-1',
    isActive = true,
    priority = 1,
    createdAt = new Date('2025-01-01T00:00:00Z'),
    categoryId = 'cat-1',
    propertyId = 'prop-1',
    criteria = {
      accounts: ['acc-1'],
      date: { dayRange: { start: 1, end: 15 }, months: [1] },
      value: { min: 1000, max: 1500, operator: 'between' },
      description: { keywords: ['ALUGUEL'], operator: 'or' },
    } as RuleCriteria,
  } = {}): CategorizationRule {
    const rule: CategorizationRule = {
      id,
      name: `Rule ${id}`,
      description: null,
      isActive,
      priority,
      categoryId: categoryId ?? null,
      propertyId: propertyId ?? null,
      criteria: criteria as unknown as PrismaTypes.JsonObject,
      createdAt,
      updatedAt: createdAt,
    };
    return rule;
  }

  it('matches when all criteria pass (AND logic), computes confidence using design weights', async () => {
    const tx = makeTx();
    const rule = makeRule(); // accounts, date in Jan 1-15, amount 1200 (abs), description contains 'ALUGUEL'
    const engine = ruleEngine;

    const result = await engine.evaluateTransaction(tx, [rule]);
    expect(result).toHaveLength(1);
    const best = result[0];

    // Suggested targets come from rule
    expect(best.ruleId).toBe(rule.id);
    expect(best.suggestedCategoryId).toBe(rule.categoryId);
    expect(best.suggestedPropertyId).toBe(rule.propertyId);

    // Confidence = average of [acc(1.0), value(0.9), date(0.7), desc(1.0)]
    // = (1 + 0.9 + 0.7 + 1) / 4 = 0.9
    expect(Math.abs(best.confidence - 0.9)).toBeLessThan(1e-6);
  });

  it('uses absolute value for amount comparisons', async () => {
    const tx = makeTx({ amount: -80 }); // abs(80)
    const rule = makeRule({
      criteria: {
        value: { max: 100, operator: 'lte' },
        description: { keywords: ['CASA'], operator: 'or' },
      },
    });
    const engine = ruleEngine;
    const res = await engine.evaluateTransaction(tx, [rule]);
    expect(res).toHaveLength(1);
  });

  it('respects value.sign = negative (only matches negative amounts)', async () => {
    const engine = ruleEngine;
    const negativeTx = makeTx({ amount: -120 });
    const positiveTx = makeTx({ amount: 120 });

    const ruleNegOnly = makeRule({
      criteria: {
        value: { max: 200, operator: 'lte', sign: 'negative' },
        description: { keywords: ['CASA'], operator: 'or' },
      },
    });

    const resNeg = await engine.evaluateTransaction(negativeTx, [ruleNegOnly]);
    expect(resNeg).toHaveLength(1);

    const resPos = await engine.evaluateTransaction(positiveTx, [ruleNegOnly]);
    expect(resPos).toHaveLength(0);
  });

  it('respects value.sign = positive (only matches >= 0 amounts)', async () => {
    const engine = ruleEngine;
    const negativeTx = makeTx({ amount: -50 });
    const zeroTx = makeTx({ amount: 0 });
    const positiveTx = makeTx({ amount: 50 });

    const rulePosOnly = makeRule({
      criteria: {
        value: { min: 0, operator: 'gte', sign: 'positive' },
        description: { keywords: ['CASA'], operator: 'or' },
      },
    });

    const resNeg = await engine.evaluateTransaction(negativeTx, [rulePosOnly]);
    expect(resNeg).toHaveLength(0);

    const resZero = await engine.evaluateTransaction(zeroTx, [rulePosOnly]);
    expect(resZero).toHaveLength(1);

    const resPos = await engine.evaluateTransaction(positiveTx, [rulePosOnly]);
    expect(resPos).toHaveLength(1);
  });

  it('resolves by priority then recency if multiple rules match', async () => {
    const tx = makeTx();

    const ruleLow = makeRule({
      id: 'rule-low',
      priority: 1,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const ruleHigh = makeRule({
      id: 'rule-high',
      priority: 5,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });

    const ruleTieRecent = makeRule({
      id: 'rule-tie-recent',
      priority: 5,
      createdAt: new Date('2025-06-01T00:00:00Z'),
    });

    const engine = ruleEngine;
    const res = await engine.evaluateTransaction(tx, [
      ruleLow,
      ruleHigh,
      ruleTieRecent,
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].ruleId).toBe('rule-tie-recent'); // same priority as ruleHigh, but more recent
  });

  it('returns empty when any criterion fails', async () => {
    const tx = makeTx({
      date: new Date(Date.UTC(2025, 0, 20)), // day 20, outside 1..15
    });
    const rule = makeRule();
    const res = await ruleEngine.evaluateTransaction(tx, [rule]);
    expect(res).toHaveLength(0);
  });
});

// ---------------------------
// Section 4: suggestions service (with mocked prisma)
// ---------------------------
describe('suggestions service (prisma mocked)', () => {
  it('setBestSuggestionForTransaction deletes non-applied, checks existing applied, then upserts', async () => {
    // Get the mocked prisma instance
    const mockedPrisma = prisma as any;

    // Setup the transaction mock to return our transaction mocks when called
    mockedPrisma.$transaction.mockImplementation(async (cb: any) => {
      const txMocks = {
        transactionSuggestion: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue(null),
          upsert: vi.fn().mockResolvedValue({
            id: 'sug-1',
            processedTransactionId: 'ptx-1',
            ruleId: 'rule-1',
            suggestedCategoryId: 'cat-1',
            suggestedPropertyId: 'prop-1',
            confidence: 0.9,
          }),
        },
      };
      return cb(txMocks);
    });

    const created = await setBestSuggestionForTransaction({
      processedTransactionId: 'ptx-1',
      ruleId: 'rule-1',
      suggestedCategoryId: 'cat-1',
      suggestedPropertyId: 'prop-1',
      confidence: 0.9,
    });

    expect(mockedPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(created).toBeTruthy();
  });

  it('upsertSuggestion writes suggestion idempotently', async () => {
    const mockedPrisma = prisma as any;

    mockedPrisma.transactionSuggestion.upsert.mockResolvedValue({
      id: 'sug-2',
    });

    const created = await upsertSuggestion({
      processedTransactionId: 'ptx-2',
      ruleId: 'rule-2',
      suggestedCategoryId: null,
      suggestedPropertyId: 'prop-2',
      confidence: 0.8,
    });

    expect(mockedPrisma.transactionSuggestion.upsert).toHaveBeenCalledWith({
      where: {
        processedTransactionId_ruleId_source: {
          processedTransactionId: 'ptx-2',
          ruleId: 'rule-2',
          source: 'RULE',
        },
      },
      create: {
        processedTransactionId: 'ptx-2',
        ruleId: 'rule-2',
        suggestedCategoryId: null,
        suggestedPropertyId: 'prop-2',
        suggestedDetails: null,
        confidence: 0.8,
        source: 'RULE',
      },
      update: {
        suggestedCategoryId: null,
        suggestedPropertyId: 'prop-2',
        suggestedDetails: null,
        confidence: 0.8,
      },
      include: {
        rule: true,
        suggestedCategory: true,
        suggestedProperty: true,
      },
    });
    expect(created).toEqual({ id: 'sug-2' });
  });

  it('applySuggestion updates ProcessedTransaction and marks suggestion as applied', async () => {
    const mockedPrisma = prisma as any;

    // Track the mocks so we can assert on them
    let transactionMocks: any;

    mockedPrisma.$transaction.mockImplementation(async (cb: any) => {
      transactionMocks = {
        transactionSuggestion: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sug-3',
            processedTransactionId: 'ptx-3',
            suggestedCategoryId: 'cat-3',
            suggestedPropertyId: null,
            suggestedDetails: null,
            isApplied: false,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        category: {
          findUnique: vi.fn().mockResolvedValue({ name: 'Outras Despesas' }),
        },
        processedTransaction: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(transactionMocks);
    });

    await applySuggestion('sug-3');

    expect(mockedPrisma.$transaction).toHaveBeenCalled();
    expect(
      transactionMocks.transactionSuggestion.findUnique
    ).toHaveBeenCalledWith({
      where: { id: 'sug-3' },
      select: {
        id: true,
        processedTransactionId: true,
        suggestedCategoryId: true,
        suggestedPropertyId: true,
        suggestedDetails: true,
        isApplied: true,
      },
    });
    expect(transactionMocks.processedTransaction.update).toHaveBeenCalledWith({
      where: { id: 'ptx-3' },
      data: {
        categoryId: 'cat-3',
        propertyId: null,
        updatedAt: expect.any(Date),
      },
    });
    expect(transactionMocks.transactionSuggestion.update).toHaveBeenCalledWith({
      where: { id: 'sug-3' },
      data: { isApplied: true, appliedAt: expect.any(Date) },
    });
  });

  it('applySuggestions processes multiple ids and reports per-item results', async () => {
    const mockedPrisma = prisma as any;

    mockedPrisma.$transaction.mockImplementation(async (cb: any) => {
      const transactionMocks = {
        transactionSuggestion: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'sug-4',
            processedTransactionId: 'ptx-4',
            suggestedCategoryId: 'cat-4',
            suggestedPropertyId: 'prop-4',
            isApplied: false,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        category: {
          findUnique: vi.fn(), // won't be called since suggestedPropertyId is present
        },
        processedTransaction: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return cb(transactionMocks);
    });

    const results = await applySuggestions(['sug-4', 'sug-5']);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    // For sug-5, our mock will still return success (same mocks used). This checks "bulk pathway" shape.
    expect(results[1].success).toBe(true);
  });

  it('dismissSuggestion deletes the suggestion by id', async () => {
    const mockedPrisma = prisma as any;

    mockedPrisma.transactionSuggestion.delete.mockResolvedValue({});

    await dismissSuggestion('sug-6');

    expect(mockedPrisma.transactionSuggestion.delete).toHaveBeenCalledWith({
      where: { id: 'sug-6' },
    });
  });
});
