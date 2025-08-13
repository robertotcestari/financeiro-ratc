import { describe, expect, it, vi, beforeEach, afterAll } from 'vitest';
import { revalidatePath } from 'next/cache';

// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock the database services
vi.mock('../../lib/database/rule-management', () => ({
  ruleManagementService: {
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRuleStatus: vi.fn(),
    getRule: vi.fn(),
    listRules: vi.fn(),
    bulkToggleRules: vi.fn(),
    getRuleStats: vi.fn(),
    getActiveRules: vi.fn(),
  },
}));

vi.mock('../../lib/database/rule-testing', () => ({
  ruleTestingService: {
    testRuleCriteria: vi.fn(),
    previewRule: vi.fn(),
    validateRule: vi.fn(),
    analyzeRulePerformance: vi.fn(),
  },
}));

vi.mock('../../lib/database/rule-engine', () => ({
  ruleEngine: {
    generateSuggestions: vi.fn(),
    applyRuleToTransactions: vi.fn(),
  },
}));

// Mock Prisma client for retroactive suggestions
vi.mock('../../lib/database/client', () => ({
  prisma: {
    processedTransaction: {
      findMany: vi.fn(),
    },
  },
}));

// Import the actions after mocking
import {
  createRuleAction,
  updateRuleAction,
  deleteRuleAction,
  toggleRuleStatusAction,
  getRuleAction,
  listRulesAction,
  bulkToggleRulesAction,
  getRuleStatsAction,
  testRuleCriteriaAction,
  previewRuleAction,
  validateRuleAction,
  analyzeRulePerformanceAction,
  generateSuggestionsAction,
  applyRuleToTransactionsAction,
  getActiveRulesAction,
  generateRetroactiveSuggestionsAction,
} from '../../lib/actions/rule-management-actions';

import type { RuleWithRelations, CreateRuleRequest, UpdateRuleRequest } from '../../lib/database/rule-management';

// Mock data
const mockRule: RuleWithRelations = {
  id: 'rule-1',
  name: 'Test Rule',
  description: 'Test rule description',
  isActive: true,
  priority: 5,
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  criteria: {
    date: { dayRange: { start: 1, end: 15 } },
    value: { min: 100, max: 500, operator: 'between' },
    description: { keywords: ['ALUGUEL'], operator: 'and' },
    accounts: ['acc-1'],
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: { id: 'cat-1', name: 'Receitas' },
  property: { id: 'prop-1', code: 'PROP-001' },
};

const mockCreateRuleRequest: CreateRuleRequest = {
  name: 'New Test Rule',
  description: 'New rule description',
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  priority: 3,
  criteria: {
    description: { keywords: ['TEST'], operator: 'or' },
  },
};

const mockUpdateRuleRequest: UpdateRuleRequest = {
  name: 'Updated Rule',
  description: 'Updated description',
  priority: 7,
};

describe('Rule Management Actions', () => {
  const mockRuleManagementService = require('../../lib/database/rule-management').ruleManagementService;
  const mockRuleTestingService = require('../../lib/database/rule-testing').ruleTestingService;
  const mockRuleEngine = require('../../lib/database/rule-engine').ruleEngine;
  const mockPrisma = require('../../lib/database/client').prisma;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Rule CRUD Operations', () => {
    describe('createRuleAction', () => {
      it('successfully creates a rule', async () => {
        mockRuleManagementService.createRule.mockResolvedValue(mockRule);

        const result = await createRuleAction(mockCreateRuleRequest);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockRule);
        expect(mockRuleManagementService.createRule).toHaveBeenCalledWith(mockCreateRuleRequest);
        expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      });

      it('handles creation errors', async () => {
        const errorMessage = 'Database connection failed';
        mockRuleManagementService.createRule.mockRejectedValue(new Error(errorMessage));

        const result = await createRuleAction(mockCreateRuleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
        expect(result.data).toBeUndefined();
      });

      it('handles non-Error exceptions', async () => {
        mockRuleManagementService.createRule.mockRejectedValue('String error');

        const result = await createRuleAction(mockCreateRuleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to create rule');
      });
    });

    describe('updateRuleAction', () => {
      it('successfully updates a rule', async () => {
        const updatedRule = { ...mockRule, ...mockUpdateRuleRequest };
        mockRuleManagementService.updateRule.mockResolvedValue(updatedRule);

        const result = await updateRuleAction('rule-1', mockUpdateRuleRequest);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(updatedRule);
        expect(mockRuleManagementService.updateRule).toHaveBeenCalledWith('rule-1', mockUpdateRuleRequest);
        expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      });

      it('handles update errors', async () => {
        const errorMessage = 'Rule not found';
        mockRuleManagementService.updateRule.mockRejectedValue(new Error(errorMessage));

        const result = await updateRuleAction('rule-1', mockUpdateRuleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('deleteRuleAction', () => {
      it('successfully deletes a rule', async () => {
        mockRuleManagementService.deleteRule.mockResolvedValue(undefined);

        const result = await deleteRuleAction('rule-1');

        expect(result.success).toBe(true);
        expect(mockRuleManagementService.deleteRule).toHaveBeenCalledWith('rule-1');
        expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      });

      it('handles deletion errors', async () => {
        const errorMessage = 'Cannot delete rule with active suggestions';
        mockRuleManagementService.deleteRule.mockRejectedValue(new Error(errorMessage));

        const result = await deleteRuleAction('rule-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('toggleRuleStatusAction', () => {
      it('successfully toggles rule status', async () => {
        const toggledRule = { ...mockRule, isActive: false };
        mockRuleManagementService.toggleRuleStatus.mockResolvedValue(toggledRule);

        const result = await toggleRuleStatusAction('rule-1', false);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(toggledRule);
        expect(mockRuleManagementService.toggleRuleStatus).toHaveBeenCalledWith('rule-1', false);
        expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      });

      it('handles toggle errors', async () => {
        const errorMessage = 'Rule not found';
        mockRuleManagementService.toggleRuleStatus.mockRejectedValue(new Error(errorMessage));

        const result = await toggleRuleStatusAction('rule-1', false);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('getRuleAction', () => {
      it('successfully retrieves a rule', async () => {
        mockRuleManagementService.getRule.mockResolvedValue(mockRule);

        const result = await getRuleAction('rule-1');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockRule);
        expect(mockRuleManagementService.getRule).toHaveBeenCalledWith('rule-1');
      });

      it('handles rule not found', async () => {
        mockRuleManagementService.getRule.mockResolvedValue(null);

        const result = await getRuleAction('rule-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Rule not found');
      });

      it('handles retrieval errors', async () => {
        const errorMessage = 'Database error';
        mockRuleManagementService.getRule.mockRejectedValue(new Error(errorMessage));

        const result = await getRuleAction('rule-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('listRulesAction', () => {
      it('successfully lists rules', async () => {
        const mockListResult = {
          rules: [mockRule],
          total: 1,
        };
        mockRuleManagementService.listRules.mockResolvedValue(mockListResult);

        const result = await listRulesAction({}, 50, 0);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockListResult);
        expect(mockRuleManagementService.listRules).toHaveBeenCalledWith({}, 50, 0);
      });

      it('uses default parameters', async () => {
        const mockListResult = { rules: [], total: 0 };
        mockRuleManagementService.listRules.mockResolvedValue(mockListResult);

        await listRulesAction();

        expect(mockRuleManagementService.listRules).toHaveBeenCalledWith({}, 50, 0);
      });

      it('handles listing errors', async () => {
        const errorMessage = 'Database connection failed';
        mockRuleManagementService.listRules.mockRejectedValue(new Error(errorMessage));

        const result = await listRulesAction();

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('bulkToggleRulesAction', () => {
      it('successfully toggles multiple rules', async () => {
        const mockBulkResult = {
          updated: 2,
          errors: [],
        };
        mockRuleManagementService.bulkToggleRules.mockResolvedValue(mockBulkResult);

        const result = await bulkToggleRulesAction(['rule-1', 'rule-2'], true);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockBulkResult);
        expect(mockRuleManagementService.bulkToggleRules).toHaveBeenCalledWith(['rule-1', 'rule-2'], true);
        expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      });

      it('handles bulk toggle errors', async () => {
        const errorMessage = 'Bulk operation failed';
        mockRuleManagementService.bulkToggleRules.mockRejectedValue(new Error(errorMessage));

        const result = await bulkToggleRulesAction(['rule-1', 'rule-2'], false);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('getRuleStatsAction', () => {
      it('successfully retrieves rule statistics', async () => {
        const mockStats = {
          totalSuggestions: 100,
          appliedSuggestions: 85,
          pendingSuggestions: 15,
          successRate: 0.85,
        };
        mockRuleManagementService.getRuleStats.mockResolvedValue(mockStats);

        const result = await getRuleStatsAction('rule-1');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockStats);
        expect(mockRuleManagementService.getRuleStats).toHaveBeenCalledWith('rule-1');
      });

      it('handles stats retrieval errors', async () => {
        const errorMessage = 'Stats unavailable';
        mockRuleManagementService.getRuleStats.mockRejectedValue(new Error(errorMessage));

        const result = await getRuleStatsAction('rule-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });
  });

  describe('Rule Testing Actions', () => {
    describe('testRuleCriteriaAction', () => {
      it('successfully tests rule criteria', async () => {
        const mockTestResult = {
          matches: [
            {
              id: 'tx-1',
              date: new Date(),
              description: 'TEST',
              amount: 100,
              bankAccountName: 'Test Account',
              matched: true,
              confidence: 0.9,
            },
          ],
          totalMatches: 1,
        };
        mockRuleTestingService.testRuleCriteria.mockResolvedValue(mockTestResult);

        const testRequest = {
          criteria: { description: { keywords: ['TEST'], operator: 'or' } },
          categoryId: 'cat-1',
          limit: 50,
        };

        const result = await testRuleCriteriaAction(testRequest);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockTestResult);
        expect(mockRuleTestingService.testRuleCriteria).toHaveBeenCalledWith(testRequest);
      });

      it('handles test criteria errors', async () => {
        const errorMessage = 'Invalid criteria';
        mockRuleTestingService.testRuleCriteria.mockRejectedValue(new Error(errorMessage));

        const result = await testRuleCriteriaAction({
          criteria: {},
          limit: 50,
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('previewRuleAction', () => {
      it('successfully previews rule', async () => {
        const mockPreviewResult = {
          matches: [],
          totalMatches: 0,
        };
        mockRuleTestingService.previewRule.mockResolvedValue(mockPreviewResult);

        const previewRequest = {
          criteria: mockRule.criteria,
          categoryId: mockRule.categoryId,
          propertyId: mockRule.propertyId,
          limit: 50,
        };

        const result = await previewRuleAction(previewRequest);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPreviewResult);
        expect(mockRuleTestingService.previewRule).toHaveBeenCalledWith(previewRequest);
      });
    });

    describe('validateRuleAction', () => {
      it('successfully validates rule', async () => {
        const mockValidationResult = {
          valid: true,
          errors: [],
          warnings: ['Consider adding more specific criteria'],
        };
        mockRuleTestingService.validateRule.mockResolvedValue(mockValidationResult);

        const result = await validateRuleAction(mockRule.criteria, 'cat-1', 'prop-1');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockValidationResult);
        expect(mockRuleTestingService.validateRule).toHaveBeenCalledWith(mockRule.criteria, 'cat-1', 'prop-1');
      });
    });

    describe('analyzeRulePerformanceAction', () => {
      it('successfully analyzes rule performance', async () => {
        const mockPerformanceResult = {
          totalSuggestions: 100,
          appliedSuggestions: 85,
          dismissedSuggestions: 5,
          pendingSuggestions: 10,
          successRate: 0.85,
          averageConfidence: 0.88,
          monthlyBreakdown: [
            { month: '2025-01', suggestions: 50, applied: 42 },
            { month: '2025-02', suggestions: 50, applied: 43 },
          ],
        };
        mockRuleTestingService.analyzeRulePerformance.mockResolvedValue(mockPerformanceResult);

        const result = await analyzeRulePerformanceAction('rule-1');

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockPerformanceResult);
        expect(mockRuleTestingService.analyzeRulePerformance).toHaveBeenCalledWith('rule-1');
      });
    });
  });

  describe('Suggestion Generation Actions', () => {
    describe('generateSuggestionsAction', () => {
      it('successfully generates suggestions', async () => {
        const mockGenerationResult = {
          processed: 100,
          suggested: 25,
        };
        mockRuleEngine.generateSuggestions.mockResolvedValue(mockGenerationResult);

        const result = await generateSuggestionsAction(['tx-1', 'tx-2'], ['rule-1']);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockGenerationResult);
        expect(mockRuleEngine.generateSuggestions).toHaveBeenCalledWith(['tx-1', 'tx-2'], ['rule-1']);
        expect(revalidatePath).toHaveBeenCalledWith('/transacoes');
      });

      it('handles suggestion generation errors', async () => {
        const errorMessage = 'Rule engine error';
        mockRuleEngine.generateSuggestions.mockRejectedValue(new Error(errorMessage));

        const result = await generateSuggestionsAction(['tx-1']);

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });
    });

    describe('applyRuleToTransactionsAction', () => {
      it('successfully applies rule to transactions', async () => {
        const mockApplyResult = [
          {
            processedTransactionId: 'tx-1',
            success: true,
            matched: true,
            suggestionCreated: true,
          },
          {
            processedTransactionId: 'tx-2',
            success: true,
            matched: false,
            suggestionCreated: false,
          },
        ];
        mockRuleEngine.applyRuleToTransactions.mockResolvedValue(mockApplyResult);

        const result = await applyRuleToTransactionsAction('rule-1', ['tx-1', 'tx-2']);

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockApplyResult);
        expect(mockRuleEngine.applyRuleToTransactions).toHaveBeenCalledWith('rule-1', ['tx-1', 'tx-2']);
        expect(revalidatePath).toHaveBeenCalledWith('/transacoes');
      });
    });
  });

  describe('Helper Actions', () => {
    describe('getActiveRulesAction', () => {
      it('successfully retrieves active rules', async () => {
        const mockActiveRules = [
          {
            id: 'rule-1',
            name: 'Active Rule 1',
            isActive: true,
            priority: 5,
            categoryId: 'cat-1',
            criteria: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
        mockRuleManagementService.getActiveRules.mockResolvedValue(mockActiveRules);

        const result = await getActiveRulesAction();

        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockActiveRules);
        expect(mockRuleManagementService.getActiveRules).toHaveBeenCalled();
      });
    });
  });

  describe('Retroactive Suggestion Actions', () => {
    describe('generateRetroactiveSuggestionsAction', () => {
      it('successfully generates retroactive suggestions', async () => {
        const mockTransactions = [
          { id: 'tx-1' },
          { id: 'tx-2' },
        ];
        const mockApplyResult = [
          {
            processedTransactionId: 'tx-1',
            success: true,
            matched: true,
            suggestionCreated: true,
          },
          {
            processedTransactionId: 'tx-2',
            success: true,
            matched: false,
            suggestionCreated: false,
          },
        ];

        mockPrisma.processedTransaction.findMany.mockResolvedValue(mockTransactions);
        mockRuleEngine.applyRuleToTransactions.mockResolvedValue(mockApplyResult);

        const result = await generateRetroactiveSuggestionsAction('rule-1', {
          bankAccountIds: ['acc-1'],
          skipCategorized: true,
        });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
          processed: 2,
          suggested: 1,
          details: mockApplyResult,
        });
        expect(revalidatePath).toHaveBeenCalledWith('/transacoes');
      });

      it('builds correct where clause for filters', async () => {
        const mockTransactions = [{ id: 'tx-1' }];
        mockPrisma.processedTransaction.findMany.mockResolvedValue(mockTransactions);
        mockRuleEngine.applyRuleToTransactions.mockResolvedValue([]);

        const dateFrom = new Date('2025-01-01');
        const dateTo = new Date('2025-01-31');

        await generateRetroactiveSuggestionsAction('rule-1', {
          bankAccountIds: ['acc-1', 'acc-2'],
          dateFrom,
          dateTo,
          skipCategorized: true,
        });

        expect(mockPrisma.processedTransaction.findMany).toHaveBeenCalledWith({
          where: {
            AND: [
              { categoryId: null },
              { propertyId: null },
            ],
            transaction: {
              bankAccountId: { in: ['acc-1', 'acc-2'] },
              date: {
                gte: dateFrom,
                lte: dateTo,
              },
            },
          },
          select: { id: true },
        });
      });

      it('handles retroactive generation errors', async () => {
        const errorMessage = 'Database error';
        mockPrisma.processedTransaction.findMany.mockRejectedValue(new Error(errorMessage));

        const result = await generateRetroactiveSuggestionsAction('rule-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe(errorMessage);
      });

      it('works without filters', async () => {
        const mockTransactions = [{ id: 'tx-1' }];
        mockPrisma.processedTransaction.findMany.mockResolvedValue(mockTransactions);
        mockRuleEngine.applyRuleToTransactions.mockResolvedValue([]);

        await generateRetroactiveSuggestionsAction('rule-1');

        expect(mockPrisma.processedTransaction.findMany).toHaveBeenCalledWith({
          where: {},
          select: { id: true },
        });
      });
    });
  });

  describe('Error Handling Patterns', () => {
    it('logs errors consistently', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockRuleManagementService.createRule.mockRejectedValue(new Error('Test error'));

      await createRuleAction(mockCreateRuleRequest);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create rule:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('returns consistent error response structure', async () => {
      mockRuleManagementService.getRule.mockRejectedValue(new Error('Database error'));

      const result = await getRuleAction('rule-1');

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
    });
  });

  describe('Path Revalidation', () => {
    it('revalidates correct paths for mutation actions', async () => {
      mockRuleManagementService.createRule.mockResolvedValue(mockRule);
      mockRuleManagementService.updateRule.mockResolvedValue(mockRule);
      mockRuleManagementService.deleteRule.mockResolvedValue(undefined);
      mockRuleEngine.generateSuggestions.mockResolvedValue({ processed: 1, suggested: 1 });

      await createRuleAction(mockCreateRuleRequest);
      await updateRuleAction('rule-1', mockUpdateRuleRequest);
      await deleteRuleAction('rule-1');
      await generateSuggestionsAction(['tx-1']);

      expect(revalidatePath).toHaveBeenCalledWith('/regras-categorizacao');
      expect(revalidatePath).toHaveBeenCalledWith('/transacoes');
      expect(revalidatePath).toHaveBeenCalledTimes(4);
    });

    it('does not revalidate paths for read-only actions', async () => {
      mockRuleManagementService.getRule.mockResolvedValue(mockRule);
      mockRuleTestingService.previewRule.mockResolvedValue({ matches: [], totalMatches: 0 });

      await getRuleAction('rule-1');
      await previewRuleAction({ criteria: {}, limit: 50 });

      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});