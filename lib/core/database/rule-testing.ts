import { prisma } from './client';
import type { 
  ProcessedTransaction,
  Transaction,
  CategorizationRule,
  Category,
  Property,
  BankAccount,
  Prisma
} from '@/app/generated/prisma';
import { RuleCriteria, validateRuleCriteria } from './rule-types';
import { RuleEngine } from './rule-engine';

type ProcessedTransactionWithRelations = ProcessedTransaction & {
  transaction: (Transaction & {
    bankAccount: BankAccount;
  }) | null;
  category: Category | null;
  property: Property | null;
};

export interface RuleTestRequest {
  criteria: RuleCriteria;
  categoryId?: string;
  propertyId?: string;
  // Optional filters for test scope
  bankAccountIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number; // Max transactions to test (default 100)
}

export interface TransactionMatch {
  transaction: ProcessedTransactionWithRelations & { 
    transaction: NonNullable<ProcessedTransactionWithRelations['transaction']> 
  };
  confidence: number;
  matchingCriteria: string[];
}

export interface RuleTestResult {
  matches: TransactionMatch[];
  totalTested: number;
  matchCount: number;
  averageConfidence: number;
  criteriaBreakdown: {
    [criteria: string]: {
      tested: number;
      matched: number;
      percentage: number;
    };
  };
}

export interface RulePreviewRequest {
  ruleId: string;
  // Optional filters for preview scope
  bankAccountIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  includeAlreadyCategorized?: boolean;
  limit?: number;
}

/**
 * Rule Testing Service - Provides rule testing and preview functionality
 */
export class RuleTestingService {
  private ruleEngine = new RuleEngine();

  /**
   * Test rule criteria against transactions without creating a rule
   */
  async testRuleCriteria(params: RuleTestRequest): Promise<RuleTestResult> {
    const {
      criteria,
      categoryId,
      propertyId,
      bankAccountIds,
      dateFrom,
      dateTo,
      limit = 100
    } = params;

    // Validate criteria
    const { valid, errors } = validateRuleCriteria(criteria);
    if (!valid) {
      throw new Error(`Invalid rule criteria: ${errors.join('; ')}`);
    }

    // Validate that at least one target is provided
    if (!categoryId && !propertyId) {
      throw new Error('Rule must target at least one category or property');
    }

    // Create a temporary rule for testing
    const tempRule: CategorizationRule = {
      id: 'temp-rule-for-testing',
      name: 'Test Rule',
      description: null,
      isActive: true,
      priority: 0,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      details: null,
      criteria: JSON.parse(JSON.stringify(criteria)) as Prisma.JsonValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Build transaction query filters
    const whereClause: {
      AND?: Array<Record<string, unknown>>;
      transaction?: Record<string, unknown>;
    } = {};

    // Filter by bank accounts if specified
    if (bankAccountIds && bankAccountIds.length > 0) {
      whereClause.transaction = {
        bankAccountId: { in: bankAccountIds },
      };
    }

    // Filter by date range if specified
    if (dateFrom || dateTo) {
      whereClause.transaction = {
        ...whereClause.transaction,
        date: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      };
    }

    // Get transactions to test
    const transactions = await prisma.processedTransaction.findMany({
      where: whereClause,
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
        category: true,
        property: true,
      },
      orderBy: {
        transaction: {
          date: 'desc',
        },
      },
      take: limit,
    });

    const matches: TransactionMatch[] = [];
    const criteriaStats = {
      account: { tested: 0, matched: 0 },
      date: { tested: 0, matched: 0 },
      value: { tested: 0, matched: 0 },
      description: { tested: 0, matched: 0 },
    };

    // Test each transaction
    for (const tx of transactions) {
      if (!tx.transaction) continue;

      const evaluationResult = await this.ruleEngine.evaluateTransaction(
        tx as ProcessedTransactionWithRelations & { transaction: NonNullable<ProcessedTransactionWithRelations['transaction']> },
        [tempRule]
      );

      if (evaluationResult.length > 0) {
        const suggestion = evaluationResult[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchingCriteria = this.identifyMatchingCriteria(tx as any, criteria);
        
        matches.push({
          transaction: tx as ProcessedTransactionWithRelations & { transaction: NonNullable<ProcessedTransactionWithRelations['transaction']> },
          confidence: suggestion.confidence,
          matchingCriteria,
        });
      }

      // Update criteria statistics
      this.updateCriteriaStats(tx, criteria, criteriaStats);
    }

    // Calculate breakdown percentages
    const criteriaBreakdown: RuleTestResult['criteriaBreakdown'] = {};
    Object.entries(criteriaStats).forEach(([key, stats]) => {
      criteriaBreakdown[key] = {
        ...stats,
        percentage: stats.tested > 0 ? (stats.matched / stats.tested) * 100 : 0,
      };
    });

    const averageConfidence = matches.length > 0
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      : 0;

    return {
      matches,
      totalTested: transactions.length,
      matchCount: matches.length,
      averageConfidence,
      criteriaBreakdown,
    };
  }

  /**
   * Preview which transactions would match an existing rule
   */
  async previewRule(params: RulePreviewRequest): Promise<RuleTestResult> {
    const {
      ruleId,
      bankAccountIds,
      dateFrom,
      dateTo,
      includeAlreadyCategorized = false,
      limit = 100
    } = params;

    // Get the rule
    const rule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new Error('Rule not found');
    }

    if (!rule.isActive) {
      throw new Error('Cannot preview inactive rule');
    }

    // Parse criteria
    const criteria = rule.criteria as unknown as RuleCriteria;

    // Build transaction query filters
    const whereClause: {
      AND?: Array<Record<string, unknown>>;
      transaction?: Record<string, unknown>;
    } = {};

    if (!includeAlreadyCategorized) {
      whereClause.AND = [
        { categoryId: null },
        { propertyId: null },
      ];
    }

    // Filter by bank accounts if specified
    if (bankAccountIds && bankAccountIds.length > 0) {
      whereClause.transaction = {
        bankAccountId: { in: bankAccountIds },
      };
    }

    // Filter by date range if specified
    if (dateFrom || dateTo) {
      whereClause.transaction = {
        ...whereClause.transaction,
        date: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      };
    }

    // Get transactions to test
    const transactions = await prisma.processedTransaction.findMany({
      where: whereClause,
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
        category: true,
        property: true,
      },
      orderBy: {
        transaction: {
          date: 'desc',
        },
      },
      take: limit,
    });

    const matches: TransactionMatch[] = [];
    const criteriaStats = {
      account: { tested: 0, matched: 0 },
      date: { tested: 0, matched: 0 },
      value: { tested: 0, matched: 0 },
      description: { tested: 0, matched: 0 },
    };

    // Test each transaction
    for (const tx of transactions) {
      if (!tx.transaction) continue;

      const evaluationResult = await this.ruleEngine.evaluateTransaction(
        tx as ProcessedTransactionWithRelations & { transaction: NonNullable<ProcessedTransactionWithRelations['transaction']> },
        [rule]
      );

      if (evaluationResult.length > 0) {
        const suggestion = evaluationResult[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchingCriteria = this.identifyMatchingCriteria(tx as any, criteria);
        
        matches.push({
          transaction: tx as ProcessedTransactionWithRelations & { transaction: NonNullable<ProcessedTransactionWithRelations['transaction']> },
          confidence: suggestion.confidence,
          matchingCriteria,
        });
      }

      // Update criteria statistics
      this.updateCriteriaStats(tx, criteria, criteriaStats);
    }

    // Calculate breakdown percentages
    const criteriaBreakdown: RuleTestResult['criteriaBreakdown'] = {};
    Object.entries(criteriaStats).forEach(([key, stats]) => {
      criteriaBreakdown[key] = {
        ...stats,
        percentage: stats.tested > 0 ? (stats.matched / stats.tested) * 100 : 0,
      };
    });

    const averageConfidence = matches.length > 0
      ? matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length
      : 0;

    return {
      matches,
      totalTested: transactions.length,
      matchCount: matches.length,
      averageConfidence,
      criteriaBreakdown,
    };
  }

  /**
   * Validate rule configuration without testing transactions
   */
  async validateRule(criteria: RuleCriteria, categoryId?: string, propertyId?: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate criteria structure
    const { valid: criteriaValid, errors: criteriaErrors } = validateRuleCriteria(criteria);
    if (!criteriaValid) {
      errors.push(...criteriaErrors);
    }

    // Validate targets
    if (!categoryId && !propertyId) {
      errors.push('Rule must target at least one category or property');
    }

    // Validate category exists
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        errors.push('Specified category does not exist');
      }
    }

    // Validate property exists
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (!property) {
        errors.push('Specified property does not exist');
      }
    }

    // Validate bank accounts exist
    if (criteria.accounts && criteria.accounts.length > 0) {
      const accounts = await prisma.bankAccount.findMany({
        where: { id: { in: criteria.accounts } },
      });
      if (accounts.length !== criteria.accounts.length) {
        errors.push('One or more specified bank accounts do not exist');
      }
    }

    // Check for overly broad criteria (warnings)
    if (!criteria.date && !criteria.value && !criteria.description && !criteria.accounts?.length) {
      warnings.push('Rule has no criteria and will match all transactions');
    }

    if (criteria.description && criteria.description.keywords.length === 1 && 
        criteria.description.keywords[0].length < 3) {
      warnings.push('Short description keywords may produce too many matches');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get rule performance analysis
   */
  async analyzeRulePerformance(ruleId: string): Promise<{
    totalSuggestions: number;
    appliedSuggestions: number;
    dismissedSuggestions: number;
    pendingSuggestions: number;
    successRate: number;
    averageConfidence: number;
    monthlyBreakdown: Array<{
      month: string;
      suggestions: number;
      applied: number;
    }>;
  }> {
    const rule = await prisma.categorizationRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new Error('Rule not found');
    }

    // Get suggestion statistics
    const suggestions = await prisma.transactionSuggestion.findMany({
      where: { ruleId },
      include: {
        processedTransaction: {
          include: {
            transaction: true,
          },
        },
      },
    });

    const totalSuggestions = suggestions.length;
    const appliedSuggestions = suggestions.filter(s => s.isApplied).length;
    const pendingSuggestions = suggestions.filter(s => !s.isApplied).length;
    const dismissedSuggestions = 0; // We delete dismissed suggestions, so this is always 0

    const averageConfidence = totalSuggestions > 0
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / totalSuggestions
      : 0;

    // Calculate monthly breakdown
    const monthlyMap = new Map<string, { suggestions: number; applied: number }>();
    
    suggestions.forEach(s => {
      const date = s.processedTransaction?.transaction?.date;
      if (date) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthlyMap.get(monthKey) || { suggestions: 0, applied: 0 };
        current.suggestions += 1;
        if (s.isApplied) current.applied += 1;
        monthlyMap.set(monthKey, current);
      }
    });

    const monthlyBreakdown = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalSuggestions,
      appliedSuggestions,
      dismissedSuggestions,
      pendingSuggestions,
      successRate: totalSuggestions > 0 ? appliedSuggestions / totalSuggestions : 0,
      averageConfidence,
      monthlyBreakdown,
    };
  }

  /**
   * Helper method to identify which criteria matched for a transaction
   */
  private identifyMatchingCriteria(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    criteria: RuleCriteria
  ): string[] {
    const matching: string[] = [];

    // Check account criteria
    if (criteria.accounts && criteria.accounts.length > 0) {
      if (criteria.accounts.includes(tx.transaction.bankAccountId)) {
        matching.push('account');
      }
    }

    // Check date criteria
    if (criteria.date) {
      // This is a simplified check - the actual logic is in rule-engine.ts
      matching.push('date');
    }

    // Check value criteria
    if (criteria.value) {
      matching.push('value');
    }

    // Check description criteria
    if (criteria.description) {
      matching.push('description');
    }

    return matching;
  }

  /**
   * Helper method to update criteria statistics
   */
  private updateCriteriaStats(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    criteria: RuleCriteria,
    stats: Record<string, { tested: number; matched: number }>
  ): void {
    // Account criteria
    if (criteria.accounts && criteria.accounts.length > 0) {
      stats.account.tested += 1;
      if (criteria.accounts.includes(tx.transaction.bankAccountId)) {
        stats.account.matched += 1;
      }
    }

    // Date criteria
    if (criteria.date) {
      stats.date.tested += 1;
      // Simplified match check
      stats.date.matched += 1;
    }

    // Value criteria
    if (criteria.value) {
      stats.value.tested += 1;
      // Simplified match check
      stats.value.matched += 1;
    }

    // Description criteria
    if (criteria.description) {
      stats.description.tested += 1;
      // Simplified match check
      stats.description.matched += 1;
    }
  }
}

// Export singleton instance
export const ruleTestingService = new RuleTestingService();