import { prisma } from './client';
import type {
  TransactionSuggestion,
  CategorizationRule,
} from '@/app/generated/prisma';

/**
 * Return all suggestions for a given processed transaction, including related info.
 */
export async function getSuggestionsForTransaction(
  processedTransactionId: string
): Promise<
  (TransactionSuggestion & {
    rule: CategorizationRule | null;
    suggestedCategory: { id: string; name: string } | null;
    suggestedProperty: { id: string; code: string } | null;
  })[]
> {
  return prisma.transactionSuggestion.findMany({
    where: { processedTransactionId, source: 'RULE' },
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
  suggestedDetails?: string | null;
  confidence: number;
  forceRegenerate?: boolean;
}): Promise<TransactionSuggestion | null> {
  const {
    processedTransactionId,
    ruleId,
    suggestedCategoryId,
    suggestedPropertyId,
    suggestedDetails,
    confidence,
    forceRegenerate = false, // Default to false to maintain backward compatibility with tests
  } = params;

  return prisma.$transaction(async (tx) => {
    if (forceRegenerate) {
      // Remove ALL existing suggestions (including applied) when force regenerating
      // This ensures a fresh start when user manually triggers regeneration
      await tx.transactionSuggestion.deleteMany({
        where: { processedTransactionId },
      });
    } else {
      // Normal behavior: only remove non-applied suggestions
      await tx.transactionSuggestion.deleteMany({
        where: { processedTransactionId, isApplied: false },
      });

      // Check if there's already an applied suggestion for this rule/transaction
      const existingApplied = await tx.transactionSuggestion.findUnique({
        where: {
          processedTransactionId_ruleId_source: {
            processedTransactionId,
            ruleId,
            source: 'RULE',
          },
        },
      });

      if (existingApplied && existingApplied.isApplied) {
        return null;
      }
    }

    // Create or update the suggestion
    const created = await tx.transactionSuggestion.upsert({
      where: {
        processedTransactionId_ruleId_source: {
          processedTransactionId,
          ruleId,
          source: 'RULE',
        },
      },
      create: {
        processedTransactionId,
        ruleId,
        suggestedCategoryId: suggestedCategoryId ?? null,
        suggestedPropertyId: suggestedPropertyId ?? null,
        suggestedDetails: suggestedDetails ?? null,
        confidence,
        source: 'RULE',
      },
      update: {
        suggestedCategoryId: suggestedCategoryId ?? null,
        suggestedPropertyId: suggestedPropertyId ?? null,
        suggestedDetails: suggestedDetails ?? null,
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
  suggestedDetails?: string | null;
  confidence: number;
}): Promise<TransactionSuggestion> {
  const {
    processedTransactionId,
    ruleId,
    suggestedCategoryId,
    suggestedPropertyId,
    suggestedDetails,
    confidence,
  } = params;

  return prisma.transactionSuggestion.upsert({
    where: {
      processedTransactionId_ruleId_source: {
        processedTransactionId,
        ruleId,
        source: 'RULE',
      },
    },
    create: {
      processedTransactionId,
      ruleId,
      suggestedCategoryId: suggestedCategoryId ?? null,
      suggestedPropertyId: suggestedPropertyId ?? null,
      suggestedDetails: suggestedDetails ?? null,
      confidence,
      source: 'RULE',
    },
    update: {
      suggestedCategoryId: suggestedCategoryId ?? null,
      suggestedPropertyId: suggestedPropertyId ?? null,
      suggestedDetails: suggestedDetails ?? null,
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
        suggestedDetails: true,
        isApplied: true,
      },
    });

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }
    if (suggestion.isApplied) {
      return; // idempotent
    }

    // Business rule: validate property requirement for certain categories
    // Only fetch the category if the suggestion does NOT include a property yet


    await tx.processedTransaction.update({
      where: { id: suggestion.processedTransactionId },
      data: {
        categoryId: suggestion.suggestedCategoryId ?? null,
        propertyId: suggestion.suggestedPropertyId ?? null,
        details: suggestion.suggestedDetails ?? undefined, // Only set if provided
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
