'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  categorizeTransaction,
  bulkCategorizeTransactions,
} from '@/lib/core/database/categorization';
import { findPotentialTransfers } from '@/lib/core/database/transactions';
import { prisma } from '@/lib/core/database/client';
import {
  applySuggestion,
  applySuggestions,
  dismissSuggestion,
  dismissSuggestions,
  getSuggestionsForTransaction,
} from '@/lib/core/database/suggestions';
import { ruleEngine } from '@/lib/core/database/rule-engine';
import { AICategorizationService } from '@/lib/features/ai/categorization-service';
import { InputJsonValue } from '@prisma/client/runtime/library';

const categorizeOneSchema = z.object({
  id: z.string(),
  categoryId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

export async function categorizeOneAction(
  input: z.infer<typeof categorizeOneSchema>
) {
  const validated = categorizeOneSchema.parse(input);

  try {
    await categorizeTransaction(
      validated.id,
      validated.categoryId ?? null,
      validated.propertyId ?? null
    );

    if (validated.markReviewed) {
      await prisma.processedTransaction.update({
        where: { id: validated.id },
        data: { isReviewed: true },
      });
    }

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in categorizeOneAction:', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to categorize transaction';
    return { success: false, error: message };
  }
}

const bulkCategorizeSchema = z.object({
  ids: z.array(z.string()),
  categoryId: z.string().optional().nullable(),
  propertyId: z.string().optional().nullable(),
  markReviewed: z.boolean().optional(),
});

export async function bulkCategorizeAction(
  input: z.infer<typeof bulkCategorizeSchema>
) {
  const validated = bulkCategorizeSchema.parse(input);

  try {
    await bulkCategorizeTransactions(
      validated.ids,
      validated.categoryId ?? null,
      validated.propertyId ?? null
    );

    if (validated.markReviewed) {
      await prisma.processedTransaction.updateMany({
        where: { id: { in: validated.ids } },
        data: { isReviewed: true },
      });
    }

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in bulkCategorizeAction:', error);
    return { success: false, error: 'Failed to categorize transactions' };
  }
}

const markReviewedSchema = z.object({
  id: z.string(),
  reviewed: z.boolean(),
});

export async function markReviewedAction(
  input: z.infer<typeof markReviewedSchema>
) {
  const validated = markReviewedSchema.parse(input);

  try {
    await prisma.processedTransaction.update({
      where: { id: validated.id },
      data: { isReviewed: validated.reviewed },
    });

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in markReviewedAction:', error);
    return { success: false, error: 'Failed to mark as reviewed' };
  }
}

const potentialTransfersSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export async function potentialTransfersAction(
  input: z.infer<typeof potentialTransfersSchema>
) {
  const validated = potentialTransfersSchema.parse(input);

  try {
    const transfers = await findPotentialTransfers({
      start: new Date(validated.start),
      end: new Date(validated.end),
    });
    return { success: true, transfers };
  } catch (error) {
    console.error('Error in potentialTransfersAction:', error);
    return {
      success: false,
      error: 'Failed to find potential transfers',
      transfers: [],
    };
  }
}

const confirmTransferSchema = z.object({
  originTransactionId: z.string(),
  destinationTransactionId: z.string(),
});

export async function confirmTransferAction(
  input: z.infer<typeof confirmTransferSchema>
) {
  const validated = confirmTransferSchema.parse(input);

  try {
    // Buscar as transações processadas e garantir vínculo com transações bancárias
    const originProcessed = await prisma.processedTransaction.findUnique({
      where: { id: validated.originTransactionId },
      include: { transaction: true },
    });

    const destProcessed = await prisma.processedTransaction.findUnique({
      where: { id: validated.destinationTransactionId },
      include: { transaction: true },
    });

    if (!originProcessed || !destProcessed) {
      throw new Error('Transactions not found');
    }

    // Ensure both ProcessedTransactions are linked to raw Transactions
    if (
      !originProcessed.transaction ||
      !destProcessed.transaction ||
      !originProcessed.transactionId ||
      !destProcessed.transactionId
    ) {
      throw new Error(
        'Linked raw transactions are required to confirm transfer'
      );
    }

    // Localiza uma categoria do tipo TRANSFER
    const transferCategory = await prisma.category.findFirst({
      where: { type: 'TRANSFER' as const },
      select: { id: true },
    });

    if (!transferCategory) {
      throw new Error('Transfer category not found');
    }

    // Marca ambos como categoria de Transferência e como revisados
    await prisma.processedTransaction.updateMany({
      where: {
        id: {
          in: [
            validated.originTransactionId,
            validated.destinationTransactionId,
          ],
        },
      },
      data: {
        categoryId: transferCategory.id,
        isReviewed: true,
      },
    });

    // Campo de notas removido — não anexamos descrição como nota.

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      // Ignore revalidation errors in test/dev environments
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in confirmTransferAction:', error);
    return { success: false, error: 'Failed to confirm transfer' };
  }
}

// ================== Inline Description (Details) ==================

const updateTransactionDetailsSchema = z.object({
  id: z.string(), // processedTransaction id
  details: z.string().optional().nullable(),
});

export async function updateTransactionDetailsAction(
  input: z.infer<typeof updateTransactionDetailsSchema>
) {
  const validated = updateTransactionDetailsSchema.parse(input);

  try {
    await prisma.processedTransaction.update({
      where: { id: validated.id },
      data: {
        details:
          validated.details && validated.details.trim().length > 0
            ? validated.details.trim()
            : null,
      },
    });

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in updateTransactionDetailsAction:', error);
    return { success: false, error: 'Failed to update transaction details' };
  }
}

// ================== Suggestion Actions ==================

const applySuggestionSchema = z.object({
  suggestionId: z.string(),
});

export async function applySuggestionAction(
  input: z.infer<typeof applySuggestionSchema>
) {
  const validated = applySuggestionSchema.parse(input);

  try {
    await applySuggestion(validated.suggestionId);

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in applySuggestionAction:', error);
    return { success: false, error: 'Failed to apply suggestion' };
  }
}

const applySuggestionsSchema = z.object({
  suggestionIds: z.array(z.string()),
});

export async function applySuggestionsAction(
  input: z.infer<typeof applySuggestionsSchema>
) {
  const validated = applySuggestionsSchema.parse(input);

  try {
    const results = await applySuggestions(validated.suggestionIds);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }

    return {
      success: true,
      results,
      summary: {
        total: validated.suggestionIds.length,
        successful: successCount,
        failed: failureCount,
      },
    };
  } catch (error) {
    console.error('Error in applySuggestionsAction:', error);
    return { success: false, error: 'Failed to apply suggestions' };
  }
}

const dismissSuggestionSchema = z.object({
  suggestionId: z.string(),
});

export async function dismissSuggestionAction(
  input: z.infer<typeof dismissSuggestionSchema>
) {
  const validated = dismissSuggestionSchema.parse(input);

  try {
    await dismissSuggestion(validated.suggestionId);

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error in dismissSuggestionAction:', error);
    return { success: false, error: 'Failed to dismiss suggestion' };
  }
}

const dismissSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string()),
});

export async function dismissSuggestionsAction(
  input: z.infer<typeof dismissSuggestionsSchema>
) {
  const validated = dismissSuggestionsSchema.parse(input);

  try {
    const results = await dismissSuggestions(validated.suggestionIds);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }

    return {
      success: true,
      results,
      summary: {
        total: validated.suggestionIds.length,
        successful: successCount,
        failed: failureCount,
      },
    };
  } catch (error) {
    console.error('Error in dismissSuggestionsAction:', error);
    return { success: false, error: 'Failed to dismiss suggestions' };
  }
}

const generateSuggestionsSchema = z.object({
  transactionIds: z.array(z.string()),
  ruleIds: z.array(z.string()).optional(),
});

export async function generateSuggestionsAction(
  input: z.infer<typeof generateSuggestionsSchema>
) {
  const validated = generateSuggestionsSchema.parse(input);

  try {
    const result = await ruleEngine.generateSuggestions(
      validated.transactionIds,
      validated.ruleIds
    );

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }

    return {
      success: true,
      processed: result.processed,
      suggested: result.suggested,
      matched: result.matched,
    };
  } catch (error) {
    console.error('Error in generateSuggestionsAction:', error);
    return { success: false, error: 'Failed to generate suggestions' };
  }
}

const getSuggestionsSchema = z.object({
  transactionId: z.string(),
});

export async function getSuggestionsAction(
  input: z.infer<typeof getSuggestionsSchema>
) {
  const validated = getSuggestionsSchema.parse(input);

  try {
    const suggestions = await getSuggestionsForTransaction(
      validated.transactionId
    );
    return { success: true, suggestions };
  } catch (error) {
    console.error('Error in getSuggestionsAction:', error);
    return {
      success: false,
      error: 'Failed to get suggestions',
      suggestions: [],
    };
  }
}

// ================== Bulk Delete Actions ==================

const bulkDeleteTransactionsSchema = z.object({
  ids: z.array(z.string()),
});

export async function bulkDeleteTransactionsAction(
  input: z.infer<typeof bulkDeleteTransactionsSchema>
) {
  const validated = bulkDeleteTransactionsSchema.parse(input);

  try {
    // Delete ProcessedTransaction records (cascade will handle suggestions)
    const deleteResult = await prisma.processedTransaction.deleteMany({
      where: {
        id: { in: validated.ids },
      },
    });

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }

    return {
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} transactions`,
    };
  } catch (error) {
    console.error('Error in bulkDeleteTransactionsAction:', error);
    return {
      success: false,
      error: 'Failed to delete transactions',
      deletedCount: 0,
    };
  }
}

// ================== AI Suggestion Actions ==================

const generateBulkAISuggestionsSchema = z.object({
  transactionIds: z.array(z.string()),
});

export async function generateBulkAISuggestionsAction(
  input: z.infer<typeof generateBulkAISuggestionsSchema>
) {
  const validated = generateBulkAISuggestionsSchema.parse(input);

  try {
    // Get the transactions with their details
    const transactions = await prisma.processedTransaction.findMany({
      where: {
        id: { in: validated.transactionIds },
      },
      include: {
        transaction: {
          include: {
            bankAccount: true,
          },
        },
      },
    });

    if (transactions.length === 0) {
      return { success: false, error: 'No transactions found' };
    }

    // Initialize AI service
    const aiService = new AICategorizationService();

    // Convert transactions to the format expected by AI service
    const transactionsForAI = transactions.map((t) => ({
      ...t,
      transaction: t.transaction
        ? {
            description: t.transaction.description,
            amount: Number(t.transaction.amount),
            date: t.transaction.date,
            bankAccount: {
              name: t.transaction.bankAccount.name,
              accountType: t.transaction.bankAccount.accountType.toString(),
            },
          }
        : undefined,
    }));

    // Generate AI suggestions
    let aiSuggestions;
    try {
      aiSuggestions = await aiService.generateBulkSuggestions(
        transactionsForAI
      );
    } catch (aiError: unknown) {
      console.error('Error generating AI suggestions:', aiError);

      // Check for specific error types
      const errorMessage =
        aiError instanceof Error ? aiError.message : String(aiError);

      // Safely extract an optional "code" property without using `any`
      let errorCode: string | undefined;
      if (
        typeof aiError === 'object' &&
        aiError !== null &&
        'code' in aiError
      ) {
        const possibleCode = (aiError as { code?: unknown }).code;
        if (typeof possibleCode === 'string') {
          errorCode = possibleCode;
        }
      }

      if (errorCode === 'API_ERROR' || errorMessage.includes('API key')) {
        return {
          success: false,
          error:
            'Erro de configuração: Chave de API do OpenAI inválida ou não configurada. Configure a variável OPENAI_API_KEY no arquivo .env',
        };
      }

      return {
        success: false,
        error:
          aiError instanceof Error
            ? aiError.message
            : 'Falha ao gerar sugestões de IA',
      };
    }

    // Check if we got any suggestions
    if (!aiSuggestions || aiSuggestions.length === 0) {
      console.warn('No AI suggestions generated for transactions');
      return {
        success: false,
        error:
          'Nenhuma sugestão foi gerada. Verifique se a API está configurada corretamente.',
      };
    }

    // Store AI suggestions in the database
    const createdSuggestions = await Promise.all(
      aiSuggestions.map(async (aiSuggestion) => {
        try {
          // Check if a suggestion already exists for this transaction (avoid duplicates)
          const existingSuggestion =
            await prisma.transactionSuggestion.findFirst({
              where: {
                processedTransactionId: aiSuggestion.processedTransactionId,
                source: 'AI',
              },
            });

          if (existingSuggestion) {
            // Update existing AI suggestion
            return await prisma.transactionSuggestion.update({
              where: { id: existingSuggestion.id },
              data: {
                suggestedCategoryId: aiSuggestion.suggestedCategoryId,
                suggestedPropertyId: aiSuggestion.suggestedPropertyId,
                confidence: aiSuggestion.confidence,
                reasoning: aiSuggestion.reasoning,
                aiMetadata: aiSuggestion.metadata as unknown as InputJsonValue,
              },
            });
          } else {
            // Create new AI suggestion
            return await prisma.transactionSuggestion.create({
              data: {
                processedTransactionId: aiSuggestion.processedTransactionId,
                source: 'AI',
                ruleId: null, // AI suggestions don't have a rule
                suggestedCategoryId: aiSuggestion.suggestedCategoryId,
                suggestedPropertyId: aiSuggestion.suggestedPropertyId,
                confidence: aiSuggestion.confidence,
                aiMetadata: aiSuggestion.metadata as unknown as InputJsonValue,
              },
            });
          }
        } catch (error) {
          console.error('Error creating AI suggestion:', error);
          return null;
        }
      })
    );

    const successfulSuggestions = createdSuggestions.filter((s) => s !== null);

    try {
      revalidatePath('/transacoes');
    } catch (revalidateError) {
      console.warn('Revalidation error (non-critical):', revalidateError);
    }

    return {
      success: true,
      processed: transactions.length,
      suggested: successfulSuggestions.length,
      message: `Generated ${successfulSuggestions.length} AI suggestions for ${transactions.length} transactions`,
    };
  } catch (error) {
    console.error('Error in generateBulkAISuggestionsAction:', error);
    return { success: false, error: 'Failed to generate AI suggestions' };
  }
}
