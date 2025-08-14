import { prisma } from './client';
import type {
  TransactionSuggestion,
  CategorizationRule,
  SuggestionSource,
} from '../../app/generated/prisma';
import type { AISuggestionData } from '../ai/types';

/**
 * Return all suggestions for a given processed transaction, including related info.
 */
export async function getSuggestionsForTransaction(
  processedTransactionId: string
): Promise<
  (TransactionSuggestion & {
    rule: CategorizationRule;
    suggestedCategory: { id: string; name: string } | null;
    suggestedProperty: { id: string; code: string } | null;
  })[]
> {
  return prisma.transactionSuggestion.findMany({
    where: { processedTransactionId },
    include: {
      rule: true,
      suggestedCategory: { select: { id: true, name: true } },
      suggestedProperty: { select: { id: true, code: true } },
    },
    orderBy: [
      { isApplied: 'asc' },
      { confidence: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Replace any non-applied suggestions for a transaction with a single "best" suggestion.
 * - Deletes all non-applied suggestions for the processedTransactionId
 * - Creates (or updates) the provided suggestion for the selected ruleId
 * - Will NOT override an existing applied suggestion for the same (transaction, rule) pair
 */
export async function setBestSuggestionForTransaction(params: {
  processedTransactionId: string;
  ruleId: string;
  suggestedCategoryId?: string | null;
  suggestedPropertyId?: string | null;
  confidence: number;
}): Promise<TransactionSuggestion | null> {
  const {
    processedTransactionId,
    ruleId,
    suggestedCategoryId,
    suggestedPropertyId,
    confidence,
  } = params;

  return prisma.$transaction(async (tx) => {
    // Remove existing non-applied suggestions (keep audit/applied history)
    await tx.transactionSuggestion.deleteMany({
      where: { processedTransactionId, isApplied: false },
    });

    // If there is already an applied suggestion for this rule/transaction, do not create a duplicate
    const existingApplied = await tx.transactionSuggestion.findUnique({
      where: {
        processedTransactionId_ruleId_source: { 
          processedTransactionId, 
          ruleId,
          source: 'RULE' 
        },
      },
    });

    if (existingApplied && existingApplied.isApplied) {
      return null;
    }

    // Create or update (in case a not-yet-deleted unique record exists)
    const created = await tx.transactionSuggestion.upsert({
      where: {
        processedTransactionId_ruleId_source: { 
          processedTransactionId, 
          ruleId,
          source: 'RULE'
        },
      },
      create: {
        processedTransactionId,
        ruleId,
        suggestedCategoryId: suggestedCategoryId ?? null,
        suggestedPropertyId: suggestedPropertyId ?? null,
        confidence,
        source: 'RULE',
      },
      update: {
        suggestedCategoryId: suggestedCategoryId ?? null,
        suggestedPropertyId: suggestedPropertyId ?? null,
        confidence,
      },
      include: {
        rule: true,
        suggestedCategory: true,
        suggestedProperty: true,
      },
    });

    return created;
  });
}

/**
 * Create or update a suggestion for a specific (transaction, rule) pair without deleting others.
 * Duplicate prevention enforced by composite unique index.
 */
export async function upsertSuggestion(params: {
  processedTransactionId: string;
  ruleId: string;
  suggestedCategoryId?: string | null;
  suggestedPropertyId?: string | null;
  confidence: number;
}): Promise<TransactionSuggestion> {
  const {
    processedTransactionId,
    ruleId,
    suggestedCategoryId,
    suggestedPropertyId,
    confidence,
  } = params;

  return prisma.transactionSuggestion.upsert({
    where: {
      processedTransactionId_ruleId: { processedTransactionId, ruleId },
    },
    create: {
      processedTransactionId,
      ruleId,
      suggestedCategoryId: suggestedCategoryId ?? null,
      suggestedPropertyId: suggestedPropertyId ?? null,
      confidence,
    },
    update: {
      suggestedCategoryId: suggestedCategoryId ?? null,
      suggestedPropertyId: suggestedPropertyId ?? null,
      confidence,
    },
    include: {
      rule: true,
      suggestedCategory: true,
      suggestedProperty: true,
    },
  });
}

/**
 * Apply a single suggestion:
 * - Sets categoryId and propertyId on the ProcessedTransaction
 * - Marks suggestion as applied with timestamp
 */
export async function applySuggestion(suggestionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const suggestion = await tx.transactionSuggestion.findUnique({
      where: { id: suggestionId },
      select: {
        id: true,
        processedTransactionId: true,
        suggestedCategoryId: true,
        suggestedPropertyId: true,
        isApplied: true,
      },
    });

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }
    if (suggestion.isApplied) {
      return; // idempotent
    }

    await tx.processedTransaction.update({
      where: { id: suggestion.processedTransactionId },
      data: {
        categoryId: suggestion.suggestedCategoryId ?? null,
        propertyId: suggestion.suggestedPropertyId ?? null,
        updatedAt: new Date(),
      },
    });

    await tx.transactionSuggestion.update({
      where: { id: suggestionId },
      data: { isApplied: true, appliedAt: new Date() },
    });
  });
}

/**
 * Apply multiple suggestions atomically where possible.
 * Continues processing even if some fail; returns per-item results.
 */
export async function applySuggestions(
  suggestionIds: string[]
): Promise<Array<{ suggestionId: string; success: boolean; error?: string }>> {
  const results: Array<{
    suggestionId: string;
    success: boolean;
    error?: string;
  }> = [];
  for (const id of suggestionIds) {
    try {
      await applySuggestion(id);
      results.push({ suggestionId: id, success: true });
    } catch (e) {
      results.push({
        suggestionId: id,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }
  return results;
}

/**
 * Dismiss (delete) a non-applied suggestion.
 */
export async function dismissSuggestion(suggestionId: string): Promise<void> {
  await prisma.transactionSuggestion.delete({
    where: { id: suggestionId },
  });
}

/**
 * Dismiss multiple suggestions at once.
 * Continues processing even if some fail; returns per-item results.
 */
export async function dismissSuggestions(
  suggestionIds: string[]
): Promise<Array<{ suggestionId: string; success: boolean; error?: string }>> {
  const results: Array<{
    suggestionId: string;
    success: boolean;
    error?: string;
  }> = [];
  
  for (const id of suggestionIds) {
    try {
      await dismissSuggestion(id);
      results.push({ suggestionId: id, success: true });
    } catch (e) {
      results.push({
        suggestionId: id,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

/**
 * Create an AI-generated suggestion
 * Since AI suggestions don't have a rule, we handle them specially
 */
export async function createAISuggestion(
  aiSuggestion: AISuggestionData
): Promise<TransactionSuggestion> {
  return prisma.transactionSuggestion.create({
    data: {
      processedTransactionId: aiSuggestion.processedTransactionId,
      source: 'AI' as SuggestionSource,
      ruleId: null, // AI suggestions don't have rules
      suggestedCategoryId: aiSuggestion.suggestedCategoryId,
      suggestedPropertyId: aiSuggestion.suggestedPropertyId || null,
      confidence: aiSuggestion.confidence,
      reasoning: aiSuggestion.reasoning,
      aiMetadata: aiSuggestion.metadata as Prisma.JsonValue, // Store metadata as JSON
    },
    include: {
      suggestedCategory: true,
      suggestedProperty: true,
    },
  });
}

/**
 * Create multiple AI suggestions in batch
 */
export async function createAISuggestions(
  aiSuggestions: AISuggestionData[]
): Promise<TransactionSuggestion[]> {
  const createdSuggestions: TransactionSuggestion[] = [];

  // Use transaction for batch creation
  await prisma.$transaction(async (tx) => {
    for (const aiSuggestion of aiSuggestions) {
      // Check if there's already an AI suggestion for this transaction
      const existing = await tx.transactionSuggestion.findFirst({
        where: {
          processedTransactionId: aiSuggestion.processedTransactionId,
          source: 'AI' as SuggestionSource,
        },
      });

      if (existing) {
        // Update existing AI suggestion
        const updated = await tx.transactionSuggestion.update({
          where: { id: existing.id },
          data: {
            suggestedCategoryId: aiSuggestion.suggestedCategoryId,
            suggestedPropertyId: aiSuggestion.suggestedPropertyId || null,
            confidence: aiSuggestion.confidence,
            reasoning: aiSuggestion.reasoning,
            aiMetadata: aiSuggestion.metadata as Prisma.JsonValue,
          },
          include: {
            suggestedCategory: true,
            suggestedProperty: true,
          },
        });
        createdSuggestions.push(updated);
      } else {
        // Create new AI suggestion
        const created = await tx.transactionSuggestion.create({
          data: {
            processedTransactionId: aiSuggestion.processedTransactionId,
            source: 'AI' as SuggestionSource,
            ruleId: null,
            suggestedCategoryId: aiSuggestion.suggestedCategoryId,
            suggestedPropertyId: aiSuggestion.suggestedPropertyId || null,
            confidence: aiSuggestion.confidence,
            reasoning: aiSuggestion.reasoning,
            aiMetadata: aiSuggestion.metadata as Prisma.JsonValue,
          },
          include: {
            suggestedCategory: true,
            suggestedProperty: true,
          },
        });
        createdSuggestions.push(created);
      }
    }
  });

  return createdSuggestions;
}

/**
 * Get all suggestions (both rule-based and AI) for a transaction
 */
export async function getAllSuggestionsForTransaction(
  processedTransactionId: string
): Promise<{
  ruleSuggestions: TransactionSuggestion[];
  aiSuggestions: TransactionSuggestion[];
}> {
  const allSuggestions = await prisma.transactionSuggestion.findMany({
    where: { processedTransactionId },
    include: {
      rule: true,
      suggestedCategory: true,
      suggestedProperty: true,
    },
    orderBy: [
      { source: 'asc' }, // AI first, then RULE
      { confidence: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  const ruleSuggestions = allSuggestions.filter(s => s.source === 'RULE');
  const aiSuggestions = allSuggestions.filter(s => s.source === 'AI');

  return {
    ruleSuggestions,
    aiSuggestions,
  };
}
