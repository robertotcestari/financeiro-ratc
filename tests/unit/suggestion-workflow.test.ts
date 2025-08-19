import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// Mock prisma client before importing anything that uses it
vi.mock('@/lib/core/database/client', () => ({
  prisma: {
    transactionSuggestion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    processedTransaction: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    categorizationRule: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Import modules after mocking
import { prisma } from '@/lib/core/database/client';
import {
  getSuggestionsForTransaction,
  applySuggestion,
  dismissSuggestion,
  setBestSuggestionForTransaction,
} from '@/lib/core/database/suggestions';
import { ruleEngine } from '@/lib/core/database/rule-engine';

const mockedPrisma = vi.mocked(prisma);

// Test data factories
export const createMockProcessedTransaction = (overrides = {}) => ({
  id: 'ptx-1',
  transactionId: 't-1',
  year: 2025,
  month: 1,
  categoryId: null,
  propertyId: null,
  details: null,
  notes: null,
  isReviewed: false,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  updatedAt: new Date('2025-01-10T10:00:00Z'),
  transaction: {
    id: 't-1',
    bankAccountId: 'acc-1',
    date: new Date('2025-01-10T10:00:00Z'),
    description: 'ALUGUEL CASA CENTRO',
    amount: new Decimal(-1200),
    balance: null,
    ofxTransId: null,
    ofxAccountId: null,
    importBatchId: null,
    isDuplicate: false,
    createdAt: new Date('2025-01-10T10:00:00Z'),
    updatedAt: new Date('2025-01-10T10:00:00Z'),
  },
  ...overrides,
});

export const createMockRule = (overrides = {}) => ({
  id: 'rule-1',
  name: 'Rent Payment Rule',
  description: 'Auto-categorize rent payments',
  isActive: true,
  priority: 10,
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  criteria: {
    accounts: ['acc-1'],
    date: { dayRange: { start: 1, end: 15 }, months: [1] },
    value: { min: 1000, max: 1500, operator: 'between' },
    description: { keywords: ['ALUGUEL'], operator: 'or' },
  },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

export const createMockSuggestion = (overrides = {}) => ({
  id: 'sug-1',
  processedTransactionId: 'ptx-1',
  ruleId: 'rule-1',
  suggestedCategoryId: 'cat-1',
  suggestedPropertyId: 'prop-1',
  confidence: 0.9,
  isApplied: false,
  appliedAt: null,
  createdAt: new Date('2025-01-10T10:00:00Z'),
  rule: createMockRule(),
  suggestedCategory: {
    id: 'cat-1',
    name: 'Receitas > Aluguel',
  },
  suggestedProperty: {
    id: 'prop-1',
    code: 'CAT - Rua Brasil',
  },
  ...overrides,
});

describe('Suggestion Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Suggestion Lifecycle', () => {
    it('should handle complete suggestion workflow: generate -> apply -> verify', async () => {
      // Step 1: Setup mock data
      const mockTransaction = createMockProcessedTransaction();
      const mockRule = createMockRule();
      const mockSuggestion = createMockSuggestion();

      // Step 2: Mock rule evaluation and suggestion generation
      mockedPrisma.categorizationRule.findMany.mockResolvedValue([mockRule]);
      mockedPrisma.processedTransaction.findMany.mockResolvedValue([mockTransaction]);
      
      // Mock setBestSuggestionForTransaction workflow
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        const txMocks = {
          transactionSuggestion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findUnique: vi.fn().mockResolvedValue(null),
            upsert: vi.fn().mockResolvedValue(mockSuggestion),
          },
        };
        return callback(txMocks);
      });

      // Step 3: Generate suggestions
      const generationResult = await ruleEngine.generateSuggestions(['ptx-1']);
      
      expect(generationResult.processed).toBe(1);
      expect(generationResult.suggested).toBe(1);

      // Step 4: Retrieve generated suggestions
      mockedPrisma.transactionSuggestion.findMany.mockResolvedValue([mockSuggestion]);
      
      const suggestions = await getSuggestionsForTransaction('ptx-1');
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestedCategoryId).toBe('cat-1');
      expect(suggestions[0].suggestedPropertyId).toBe('prop-1');
      expect(suggestions[0].confidence).toBe(0.9);

      // Step 5: Apply suggestion
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        const txMocks = {
          transactionSuggestion: {
            findUnique: vi.fn().mockResolvedValue({
              ...mockSuggestion,
              isApplied: false,
            }),
            update: vi.fn().mockResolvedValue({
              ...mockSuggestion,
              isApplied: true,
              appliedAt: new Date(),
            }),
          },
          processedTransaction: {
            update: vi.fn().mockResolvedValue({
              ...mockTransaction,
              categoryId: 'cat-1',
              propertyId: 'prop-1',
            }),
          },
        };
        return callback(txMocks);
      });

      await applySuggestion('sug-1');

      // Verify the application workflow was called correctly
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle suggestion dismissal workflow', async () => {
      const mockSuggestion = createMockSuggestion({ isApplied: false });

      mockedPrisma.transactionSuggestion.delete.mockResolvedValue(mockSuggestion);

      await dismissSuggestion('sug-1');

      expect(mockedPrisma.transactionSuggestion.delete).toHaveBeenCalledWith({
        where: { id: 'sug-1' },
      });
    });

    it('should prevent duplicate suggestions for same transaction-rule pair', async () => {
      const mockTransaction = createMockProcessedTransaction();
      const mockRule = createMockRule();

      // Mock transaction that deletes existing non-applied suggestions
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        const txMocks = {
          transactionSuggestion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 2 }), // deleted 2 old suggestions
            findUnique: vi.fn().mockResolvedValue(null), // no existing applied suggestion
            upsert: vi.fn().mockResolvedValue(createMockSuggestion()),
          },
        };
        return callback(txMocks);
      });

      const result = await setBestSuggestionForTransaction({
        processedTransactionId: 'ptx-1',
        ruleId: 'rule-1',
        suggestedCategoryId: 'cat-1',
        suggestedPropertyId: 'prop-1',
        confidence: 0.9,
      });

      expect(result).toBeTruthy();
      expect(mockedPrisma.$transaction).toHaveBeenCalled();
    });

    it('should not override existing applied suggestions', async () => {
      // Mock existing applied suggestion
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        const txMocks = {
          transactionSuggestion: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findUnique: vi.fn().mockResolvedValue({
              ...createMockSuggestion(),
              isApplied: true,
              appliedAt: new Date(),
            }),
          },
        };
        return callback(txMocks);
      });

      const result = await setBestSuggestionForTransaction({
        processedTransactionId: 'ptx-1',
        ruleId: 'rule-1',
        suggestedCategoryId: 'cat-new',
        suggestedPropertyId: 'prop-new',
        confidence: 0.95,
      });

      // Should return null when existing applied suggestion exists
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle transactions without linked raw transactions', async () => {
      const mockTransactionWithoutRaw = createMockProcessedTransaction({
        transaction: null,
        transactionId: null,
      });

      mockedPrisma.categorizationRule.findMany.mockResolvedValue([createMockRule()]);
      mockedPrisma.processedTransaction.findMany.mockResolvedValue([mockTransactionWithoutRaw]);

      const result = await ruleEngine.generateSuggestions(['ptx-1']);

      // Should process but not suggest anything for transactions without raw data
      expect(result.processed).toBe(1);
      expect(result.suggested).toBe(0);
    });

    it('should handle invalid rule criteria gracefully', async () => {
      const mockRuleWithInvalidCriteria = createMockRule({
        criteria: {
          date: { months: [0, 13] }, // invalid months
          value: { min: 500, max: 100, operator: 'between' }, // min > max
        },
      });

      mockedPrisma.categorizationRule.findMany.mockResolvedValue([mockRuleWithInvalidCriteria]);
      mockedPrisma.processedTransaction.findMany.mockResolvedValue([createMockProcessedTransaction()]);

      const result = await ruleEngine.generateSuggestions(['ptx-1']);

      // Should process but not generate suggestions for invalid rules
      expect(result.processed).toBe(1);
      expect(result.suggested).toBe(0);
    });

    it('should handle rules without targets (no category or property)', async () => {
      const mockRuleWithoutTargets = createMockRule({
        categoryId: null,
        propertyId: null,
      });

      mockedPrisma.categorizationRule.findMany.mockResolvedValue([mockRuleWithoutTargets]);
      mockedPrisma.processedTransaction.findMany.mockResolvedValue([createMockProcessedTransaction()]);

      const result = await ruleEngine.generateSuggestions(['ptx-1']);

      // Should skip rules without targets
      expect(result.processed).toBe(1);
      expect(result.suggested).toBe(0);
    });

    it('should handle partial failures in bulk operations gracefully', async () => {
      const mockSuggestions = [
        createMockSuggestion({ id: 'sug-1' }),
        createMockSuggestion({ id: 'sug-2' }),
      ];

      // Mock first call succeeds, second fails
      let callCount = 0;
      mockedPrisma.$transaction.mockImplementation(async (callback) => {
        callCount++;
        if (callCount === 1) {
          // First suggestion succeeds
          const txMocks = {
            transactionSuggestion: {
              findUnique: vi.fn().mockResolvedValue({ ...mockSuggestions[0], isApplied: false }),
              update: vi.fn().mockResolvedValue({}),
            },
            processedTransaction: {
              update: vi.fn().mockResolvedValue({}),
            },
          };
          return callback(txMocks);
        } else {
          // Second suggestion fails
          throw new Error('Database connection lost');
        }
      });

      const { applySuggestions } = await import('@/lib/core/database/suggestions');
      const results = await applySuggestions(['sug-1', 'sug-2']);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Database connection lost');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batches of transactions efficiently', async () => {
      const transactionIds = Array.from({ length: 250 }, (_, i) => `ptx-${i + 1}`);
      const mockTransactions = transactionIds.map((id, index) => 
        createMockProcessedTransaction({ 
          id,
          transactionId: `t-${index + 1}`,
        })
      );

      // Mock findMany to return transactions in batches (simulate chunking)
      mockedPrisma.categorizationRule.findMany.mockResolvedValue([createMockRule()]);
      
      let batchCallCount = 0;
      mockedPrisma.processedTransaction.findMany.mockImplementation(({ where }) => {
        batchCallCount++;
        const ids = where.id.in;
        return Promise.resolve(
          mockTransactions.filter(tx => ids.includes(tx.id))
        );
      });

      mockedPrisma.$transaction.mockResolvedValue(createMockSuggestion());

      const result = await ruleEngine.generateSuggestions(transactionIds);

      // Should process all transactions
      expect(result.processed).toBe(250);
      // Should be called in batches (250 transactions / 100 per batch = 3 batches)
      expect(batchCallCount).toBeGreaterThan(1);
    });

    it('should handle rules with multiple criteria efficiently', async () => {
      const complexRule = createMockRule({
        criteria: {
          accounts: ['acc-1', 'acc-2', 'acc-3'],
          date: { 
            dayRange: { start: 1, end: 15 }, 
            months: [1, 2, 3, 6, 7, 8, 12] 
          },
          value: { min: 100, max: 5000, operator: 'between' },
          description: { 
            keywords: ['ALUGUEL', 'CASA', 'CENTRO', 'PAGAMENTO'], 
            operator: 'and' 
          },
        },
      });

      const mockTransaction = createMockProcessedTransaction({
        transaction: {
          ...createMockProcessedTransaction().transaction,
          description: 'PAGAMENTO ALUGUEL CASA CENTRO',
          amount: new Decimal(-1200),
          date: new Date('2025-01-10T10:00:00Z'),
          bankAccountId: 'acc-1',
        },
      });

      mockedPrisma.categorizationRule.findMany.mockResolvedValue([complexRule]);
      mockedPrisma.processedTransaction.findMany.mockResolvedValue([mockTransaction]);
      mockedPrisma.$transaction.mockResolvedValue(createMockSuggestion());

      const result = await ruleEngine.generateSuggestions(['ptx-1']);

      expect(result.processed).toBe(1);
      expect(result.suggested).toBe(1);
    });
  });
});