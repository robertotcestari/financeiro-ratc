'use server';

import { revalidatePath } from 'next/cache';
import { 
  ruleManagementService,
  type CreateRuleRequest,
  type UpdateRuleRequest,
  type RuleListFilters,
  type RuleWithRelations
} from '@/lib/core/database/rule-management';
import {
  ruleTestingService,
  type RuleTestRequest,
  type RulePreviewRequest,
  type RuleTestResult
} from '@/lib/core/database/rule-testing';
import { ruleEngine } from '@/lib/core/database/rule-engine';
import type { RuleCriteria } from '@/lib/core/database/rule-types';
import { createActionLogger } from '@/lib/core/logger/logger';

// =============== Rule CRUD Actions ===============

export async function createRuleAction(
  params: CreateRuleRequest
): Promise<{ success: boolean; data?: RuleWithRelations; error?: string }> {
  const actionLogger = createActionLogger('createRule', { 
    ruleName: params.name,
    priority: params.priority 
  });
  
  try {
    actionLogger.info('Creating new categorization rule');
    const rule = await ruleManagementService.createRule(params);
    actionLogger.info({ ruleId: rule.id }, 'Rule created successfully');
    revalidatePath('/regras-categorizacao');
    return { success: true, data: rule };
  } catch (error) {
    actionLogger.error({ error }, 'Failed to create rule');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create rule',
    };
  }
}

export async function updateRuleAction(
  ruleId: string,
  params: UpdateRuleRequest
): Promise<{ success: boolean; data?: RuleWithRelations; error?: string }> {
  const actionLogger = createActionLogger('updateRule', { 
    ruleId,
    updates: Object.keys(params) 
  });
  
  try {
    actionLogger.info('Updating categorization rule');
    const rule = await ruleManagementService.updateRule(ruleId, params);
    actionLogger.info('Rule updated successfully');
    revalidatePath('/regras-categorizacao');
    return { success: true, data: rule };
  } catch (error) {
    actionLogger.error({ error }, 'Failed to update rule');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update rule',
    };
  }
}

export async function deleteRuleAction(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ruleManagementService.deleteRule(ruleId);
    revalidatePath('/regras-categorizacao');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete rule',
    };
  }
}

export async function toggleRuleStatusAction(
  ruleId: string,
  isActive: boolean
): Promise<{ success: boolean; data?: RuleWithRelations; error?: string }> {
  try {
    const rule = await ruleManagementService.toggleRuleStatus(ruleId, isActive);
    revalidatePath('/regras-categorizacao');
    return { success: true, data: rule };
  } catch (error) {
    console.error('Failed to toggle rule status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle rule status',
    };
  }
}

export async function getRuleAction(
  ruleId: string
): Promise<{ success: boolean; data?: RuleWithRelations; error?: string }> {
  try {
    const rule = await ruleManagementService.getRule(ruleId);
    if (!rule) {
      return { success: false, error: 'Rule not found' };
    }
    return { success: true, data: rule };
  } catch (error) {
    console.error('Failed to get rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rule',
    };
  }
}

export async function listRulesAction(
  filters: RuleListFilters = {},
  limit = 50,
  offset = 0
): Promise<{
  success: boolean;
  data?: { rules: RuleWithRelations[]; total: number };
  error?: string;
}> {
  try {
    const result = await ruleManagementService.listRules(filters, limit, offset);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list rules:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list rules',
    };
  }
}

export async function bulkToggleRulesAction(
  ruleIds: string[],
  isActive: boolean
): Promise<{
  success: boolean;
  data?: { updated: number; errors: Array<{ ruleId: string; error: string }> };
  error?: string;
}> {
  try {
    const result = await ruleManagementService.bulkToggleRules(ruleIds, isActive);
    revalidatePath('/regras-categorizacao');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to bulk toggle rules:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk toggle rules',
    };
  }
}

export async function getRuleStatsAction(
  ruleId: string
): Promise<{
  success: boolean;
  data?: {
    totalSuggestions: number;
    appliedSuggestions: number;
    pendingSuggestions: number;
    successRate: number;
  };
  error?: string;
}> {
  try {
    const stats = await ruleManagementService.getRuleStats(ruleId);
    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to get rule stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get rule stats',
    };
  }
}

// =============== Rule Testing Actions ===============

export async function testRuleCriteriaAction(
  params: RuleTestRequest
): Promise<{ success: boolean; data?: RuleTestResult; error?: string }> {
  try {
    const result = await ruleTestingService.testRuleCriteria(params);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to test rule criteria:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test rule criteria',
    };
  }
}

export async function previewRuleAction(
  params: RulePreviewRequest
): Promise<{ success: boolean; data?: RuleTestResult; error?: string }> {
  try {
    const result = await ruleTestingService.previewRule(params);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to preview rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to preview rule',
    };
  }
}

export async function validateRuleAction(
  criteria: RuleCriteria,
  categoryId?: string,
  propertyId?: string
): Promise<{
  success: boolean;
  data?: { valid: boolean; errors: string[]; warnings: string[] };
  error?: string;
}> {
  try {
    const result = await ruleTestingService.validateRule(criteria, categoryId, propertyId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to validate rule:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to validate rule',
    };
  }
}

export async function analyzeRulePerformanceAction(
  ruleId: string
): Promise<{
  success: boolean;
  data?: {
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
  };
  error?: string;
}> {
  try {
    const result = await ruleTestingService.analyzeRulePerformance(ruleId);
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to analyze rule performance:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze rule performance',
    };
  }
}

// =============== Suggestion Generation Actions ===============

export async function generateSuggestionsAction(
  processedTransactionIds: string[],
  ruleIds?: string[]
): Promise<{
  success: boolean;
  data?: { processed: number; suggested: number };
  error?: string;
}> {
  try {
    const result = await ruleEngine.generateSuggestions(processedTransactionIds, ruleIds);
    revalidatePath('/transacoes');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to generate suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
}

export async function applyRuleToTransactionsAction(
  ruleId: string,
  processedTransactionIds: string[]
): Promise<{
  success: boolean;
  data?: Array<{
    processedTransactionId: string;
    success: boolean;
    matched: boolean;
    suggestionCreated: boolean;
    error?: string;
  }>;
  error?: string;
}> {
  try {
    const result = await ruleEngine.applyRuleToTransactions(ruleId, processedTransactionIds);
    revalidatePath('/transacoes');
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to apply rule to transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to apply rule to transactions',
    };
  }
}

// =============== Helper Actions ===============

export async function getActiveRulesAction(): Promise<{
  success: boolean;
  data?: import('../../app/generated/prisma').CategorizationRule[];
  error?: string;
}> {
  try {
    const rules = await ruleManagementService.getActiveRules();
    return { success: true, data: rules };
  } catch (error) {
    console.error('Failed to get active rules:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get active rules',
    };
  }
}

// =============== Retroactive Suggestion Actions ===============

export async function generateRetroactiveSuggestionsAction(
  ruleId: string,
  options?: {
    bankAccountIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    skipCategorized?: boolean;
  }
): Promise<{
  success: boolean;
  data?: {
    processed: number;
    suggested: number;
    details: Array<{
      processedTransactionId: string;
      success: boolean;
      matched: boolean;
      suggestionCreated: boolean;
      error?: string;
    }>;
  };
  error?: string;
}> {
  try {
    // Get transactions that match the filters
    const whereClause: {
      AND?: Array<Record<string, unknown>>;
      transaction?: Record<string, unknown>;
    } = {};

    if (options?.skipCategorized) {
      whereClause.AND = [
        { categoryId: null },
        { propertyId: null },
      ];
    }

    if (options?.bankAccountIds && options.bankAccountIds.length > 0) {
      whereClause.transaction = {
        bankAccountId: { in: options.bankAccountIds },
      };
    }

    if (options?.dateFrom || options?.dateTo) {
      whereClause.transaction = {
        ...whereClause.transaction,
        date: {
          ...(options.dateFrom && { gte: options.dateFrom }),
          ...(options.dateTo && { lte: options.dateTo }),
        },
      };
    }

    const { prisma } = await import('../core/database/client');
    const transactions = await prisma.processedTransaction.findMany({
      where: whereClause,
      select: { id: true },
    });

    const transactionIds = transactions.map(t => t.id);

    // Apply rule to these transactions
    const details = await ruleEngine.applyRuleToTransactions(ruleId, transactionIds);
    
    const processed = details.length;
    const suggested = details.filter(d => d.suggestionCreated).length;

    revalidatePath('/transacoes');
    
    return {
      success: true,
      data: { processed, suggested, details },
    };
  } catch (error) {
    console.error('Failed to generate retroactive suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate retroactive suggestions',
    };
  }
}