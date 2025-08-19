import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock suggestion services
vi.mock('@/lib/core/database/suggestions', () => ({
  applySuggestion: vi.fn(),
  applySuggestions: vi.fn(),
  dismissSuggestion: vi.fn(),
  dismissSuggestions: vi.fn(),
  getSuggestionsForTransaction: vi.fn(),
}));

// Mock rule engine
vi.mock('@/lib/core/database/rule-engine', () => ({
  ruleEngine: {
    generateSuggestions: vi.fn(),
  },
}));

// Import the actions we want to test
import {
  applySuggestionAction,
  applySuggestionsAction,
  dismissSuggestionAction,
  dismissSuggestionsAction,
  generateSuggestionsAction,
  getSuggestionsAction,
} from '@/app/(protected)/transacoes/actions';

// Get the mocked functions
import * as suggestionServices from '@/lib/core/database/suggestions';
import * as ruleEngineModule from '@/lib/core/database/rule-engine';

const mockedSuggestionServices = vi.mocked(suggestionServices);
const mockedRuleEngine = vi.mocked(ruleEngineModule);

describe('Suggestion Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('applySuggestionAction', () => {
    it('should apply a suggestion successfully', async () => {
      mockedSuggestionServices.applySuggestion.mockResolvedValue(undefined);

      const result = await applySuggestionAction({
        suggestionId: 'sug-123',
      });

      expect(mockedSuggestionServices.applySuggestion).toHaveBeenCalledWith(
        'sug-123'
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle apply suggestion errors', async () => {
      mockedSuggestionServices.applySuggestion.mockRejectedValue(
        new Error('Database error')
      );

      const result = await applySuggestionAction({
        suggestionId: 'sug-456',
      });

      expect(mockedSuggestionServices.applySuggestion).toHaveBeenCalledWith(
        'sug-456'
      );
      expect(result).toEqual({
        success: false,
        error: 'Failed to apply suggestion',
      });
    });

    it('should validate input schema', async () => {
      // Test with invalid input (should throw validation error)
      await expect(
        applySuggestionAction({
          suggestionId: null as any, // null should fail validation
        })
      ).rejects.toThrow();
    });
  });

  describe('applySuggestionsAction', () => {
    it('should apply multiple suggestions successfully', async () => {
      const mockResults = [
        { suggestionId: 'sug-1', success: true },
        { suggestionId: 'sug-2', success: true },
        { suggestionId: 'sug-3', success: false, error: 'Not found' },
      ];

      mockedSuggestionServices.applySuggestions.mockResolvedValue(mockResults);

      const result = await applySuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2', 'sug-3'],
      });

      expect(mockedSuggestionServices.applySuggestions).toHaveBeenCalledWith([
        'sug-1',
        'sug-2',
        'sug-3',
      ]);
      expect(result).toEqual({
        success: true,
        results: mockResults,
        summary: {
          total: 3,
          successful: 2,
          failed: 1,
        },
      });
    });

    it('should handle bulk apply errors', async () => {
      mockedSuggestionServices.applySuggestions.mockRejectedValue(
        new Error('Bulk operation failed')
      );

      const result = await applySuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2'],
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to apply suggestions',
      });
    });

    it('should handle empty suggestion array', async () => {
      mockedSuggestionServices.applySuggestions.mockResolvedValue([]);

      const result = await applySuggestionsAction({
        suggestionIds: [],
      });

      expect(mockedSuggestionServices.applySuggestions).toHaveBeenCalledWith([]);
      expect(result).toEqual({
        success: true,
        results: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
        },
      });
    });
  });

  describe('dismissSuggestionAction', () => {
    it('should dismiss a suggestion successfully', async () => {
      mockedSuggestionServices.dismissSuggestion.mockResolvedValue(undefined);

      const result = await dismissSuggestionAction({
        suggestionId: 'sug-789',
      });

      expect(mockedSuggestionServices.dismissSuggestion).toHaveBeenCalledWith(
        'sug-789'
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle dismiss errors', async () => {
      mockedSuggestionServices.dismissSuggestion.mockRejectedValue(
        new Error('Suggestion not found')
      );

      const result = await dismissSuggestionAction({
        suggestionId: 'sug-nonexistent',
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to dismiss suggestion',
      });
    });
  });

  describe('dismissSuggestionsAction', () => {
    it('should dismiss multiple suggestions successfully', async () => {
      const mockResults = [
        { suggestionId: 'sug-1', success: true },
        { suggestionId: 'sug-2', success: true },
        { suggestionId: 'sug-3', success: false, error: 'Not found' },
      ];

      mockedSuggestionServices.dismissSuggestions.mockResolvedValue(mockResults);

      const result = await dismissSuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2', 'sug-3'],
      });

      expect(mockedSuggestionServices.dismissSuggestions).toHaveBeenCalledWith([
        'sug-1',
        'sug-2',
        'sug-3',
      ]);
      expect(result).toEqual({
        success: true,
        results: mockResults,
        summary: {
          total: 3,
          successful: 2,
          failed: 1,
        },
      });
    });

    it('should handle bulk dismiss errors', async () => {
      mockedSuggestionServices.dismissSuggestions.mockRejectedValue(
        new Error('Bulk dismiss operation failed')
      );

      const result = await dismissSuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2'],
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to dismiss suggestions',
      });
    });

    it('should handle empty suggestion array', async () => {
      mockedSuggestionServices.dismissSuggestions.mockResolvedValue([]);

      const result = await dismissSuggestionsAction({
        suggestionIds: [],
      });

      expect(mockedSuggestionServices.dismissSuggestions).toHaveBeenCalledWith([]);
      expect(result).toEqual({
        success: true,
        results: [],
        summary: {
          total: 0,
          successful: 0,
          failed: 0,
        },
      });
    });

    it('should handle all suggestions being successfully dismissed', async () => {
      const mockResults = [
        { suggestionId: 'sug-1', success: true },
        { suggestionId: 'sug-2', success: true },
        { suggestionId: 'sug-3', success: true },
      ];

      mockedSuggestionServices.dismissSuggestions.mockResolvedValue(mockResults);

      const result = await dismissSuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2', 'sug-3'],
      });

      expect(result.summary).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
      });
    });

    it('should handle all suggestions failing to dismiss', async () => {
      const mockResults = [
        { suggestionId: 'sug-1', success: false, error: 'Error 1' },
        { suggestionId: 'sug-2', success: false, error: 'Error 2' },
      ];

      mockedSuggestionServices.dismissSuggestions.mockResolvedValue(mockResults);

      const result = await dismissSuggestionsAction({
        suggestionIds: ['sug-1', 'sug-2'],
      });

      expect(result.summary).toEqual({
        total: 2,
        successful: 0,
        failed: 2,
      });
    });
  });

  describe('generateSuggestionsAction', () => {
    it('should generate suggestions for transactions successfully', async () => {
      const mockResult = {
        processed: 5,
        suggested: 3,
      };

      mockedRuleEngine.ruleEngine.generateSuggestions.mockResolvedValue(mockResult);

      const result = await generateSuggestionsAction({
        transactionIds: ['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'],
      });

      expect(mockedRuleEngine.ruleEngine.generateSuggestions).toHaveBeenCalledWith(
        ['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'],
        undefined
      );
      expect(result).toEqual({
        success: true,
        processed: 5,
        suggested: 3,
      });
    });

    it('should generate suggestions with rule filtering', async () => {
      const mockResult = {
        processed: 3,
        suggested: 2,
      };

      mockedRuleEngine.ruleEngine.generateSuggestions.mockResolvedValue(mockResult);

      const result = await generateSuggestionsAction({
        transactionIds: ['tx-1', 'tx-2', 'tx-3'],
        ruleIds: ['rule-1', 'rule-2'],
      });

      expect(mockedRuleEngine.ruleEngine.generateSuggestions).toHaveBeenCalledWith(
        ['tx-1', 'tx-2', 'tx-3'],
        ['rule-1', 'rule-2']
      );
      expect(result).toEqual({
        success: true,
        processed: 3,
        suggested: 2,
      });
    });

    it('should handle generation errors', async () => {
      mockedRuleEngine.ruleEngine.generateSuggestions.mockRejectedValue(
        new Error('Rule engine error')
      );

      const result = await generateSuggestionsAction({
        transactionIds: ['tx-1', 'tx-2'],
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate suggestions',
      });
    });

    it('should handle empty transaction array', async () => {
      const mockResult = {
        processed: 0,
        suggested: 0,
      };

      mockedRuleEngine.ruleEngine.generateSuggestions.mockResolvedValue(mockResult);

      const result = await generateSuggestionsAction({
        transactionIds: [],
      });

      expect(mockedRuleEngine.ruleEngine.generateSuggestions).toHaveBeenCalledWith(
        [],
        undefined
      );
      expect(result).toEqual({
        success: true,
        processed: 0,
        suggested: 0,
      });
    });
  });

  describe('getSuggestionsAction', () => {
    it('should get suggestions for a transaction successfully', async () => {
      const mockSuggestions = [
        {
          id: 'sug-1',
          processedTransactionId: 'tx-1',
          ruleId: 'rule-1',
          suggestedCategoryId: 'cat-1',
          suggestedPropertyId: 'prop-1',
          confidence: 0.9,
          isApplied: false,
          appliedAt: null,
          createdAt: new Date(),
          rule: {
            id: 'rule-1',
            name: 'Rent Payment Rule',
            description: 'Auto-categorize rent payments',
            isActive: true,
            priority: 10,
            categoryId: 'cat-1',
            propertyId: 'prop-1',
            criteria: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          suggestedCategory: {
            id: 'cat-1',
            name: 'Receitas > Aluguel',
          },
          suggestedProperty: {
            id: 'prop-1',
            code: 'CAT - Rua Brasil',
          },
        },
      ];

      mockedSuggestionServices.getSuggestionsForTransaction.mockResolvedValue(
        mockSuggestions
      );

      const result = await getSuggestionsAction({
        transactionId: 'tx-1',
      });

      expect(
        mockedSuggestionServices.getSuggestionsForTransaction
      ).toHaveBeenCalledWith('tx-1');
      expect(result).toEqual({
        success: true,
        suggestions: mockSuggestions,
      });
    });

    it('should handle no suggestions found', async () => {
      mockedSuggestionServices.getSuggestionsForTransaction.mockResolvedValue([]);

      const result = await getSuggestionsAction({
        transactionId: 'tx-nosug',
      });

      expect(result).toEqual({
        success: true,
        suggestions: [],
      });
    });

    it('should handle get suggestions errors', async () => {
      mockedSuggestionServices.getSuggestionsForTransaction.mockRejectedValue(
        new Error('Transaction not found')
      );

      const result = await getSuggestionsAction({
        transactionId: 'tx-invalid',
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to get suggestions',
        suggestions: [],
      });
    });
  });

  describe('Input validation', () => {
    it('should validate applySuggestionAction input', async () => {
      await expect(
        applySuggestionAction({
          suggestionId: 123 as any, // invalid type
        })
      ).rejects.toThrow();
    });

    it('should validate applySuggestionsAction input', async () => {
      await expect(
        applySuggestionsAction({
          suggestionIds: 'not-an-array' as any, // invalid type
        })
      ).rejects.toThrow();

      await expect(
        applySuggestionsAction({
          suggestionIds: [123, 456] as any, // invalid array content type
        })
      ).rejects.toThrow();
    });

    it('should validate dismissSuggestionAction input', async () => {
      await expect(
        dismissSuggestionAction({
          suggestionId: null as any, // invalid type
        })
      ).rejects.toThrow();
    });

    it('should validate generateSuggestionsAction input', async () => {
      await expect(
        generateSuggestionsAction({
          transactionIds: 'not-an-array' as any, // invalid type
        })
      ).rejects.toThrow();

      await expect(
        generateSuggestionsAction({
          transactionIds: ['tx-1'],
          ruleIds: 'not-an-array' as any, // invalid type
        })
      ).rejects.toThrow();
    });

    it('should validate getSuggestionsAction input', async () => {
      await expect(
        getSuggestionsAction({
          transactionId: undefined as any, // invalid type
        })
      ).rejects.toThrow();
    });
  });

  describe('Error handling patterns', () => {
    it('should handle non-Error exceptions in applySuggestion', async () => {
      mockedSuggestionServices.applySuggestion.mockRejectedValue(
        'String error' // non-Error object
      );

      const result = await applySuggestionAction({
        suggestionId: 'sug-1',
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to apply suggestion',
      });
    });

    it('should handle non-Error exceptions in generateSuggestions', async () => {
      mockedRuleEngine.ruleEngine.generateSuggestions.mockRejectedValue({
        code: 'CUSTOM_ERROR', // non-Error object
        message: 'Custom error',
      });

      const result = await generateSuggestionsAction({
        transactionIds: ['tx-1'],
      });

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate suggestions',
      });
    });
  });

  describe('Revalidation', () => {
    it('should call revalidatePath after successful operations', async () => {
      const { revalidatePath } = await import('next/cache');

      mockedSuggestionServices.applySuggestion.mockResolvedValue(undefined);
      
      await applySuggestionAction({ suggestionId: 'sug-1' });

      expect(revalidatePath).toHaveBeenCalledWith('/transacoes');
    });

    it('should handle revalidation errors gracefully', async () => {
      const { revalidatePath } = await import('next/cache');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockedSuggestionServices.applySuggestion.mockResolvedValue(undefined);
      (revalidatePath as any).mockImplementation(() => {
        throw new Error('Revalidation failed');
      });

      const result = await applySuggestionAction({ suggestionId: 'sug-1' });

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Revalidation error (non-critical):',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});