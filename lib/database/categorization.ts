import { prisma } from './client';
import type { UnifiedTransaction } from '@/app/generated/prisma';
import { CategoryType } from '@/app/generated/prisma';

/**
 * Categoriza uma transação unificada por ID
 */
export async function categorizeTransaction(
  unifiedTransactionId: string,
  overrideCategoryId: string,
  overridePropertyId?: string
): Promise<UnifiedTransaction> {
  const unifiedTransaction = await prisma.unifiedTransaction.findUnique({
    where: { id: unifiedTransactionId },
    include: { transaction: true },
  });

  if (!unifiedTransaction) {
    throw new Error('Unified transaction not found');
  }

  // Para categorização manual direta
  const categoryId = overrideCategoryId;
  const propertyId = overridePropertyId || null;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  const isTransfer = category.type === CategoryType.TRANSFER;

  // Atualiza a UnifiedTransaction existente
  const updatedUnifiedTransaction = await prisma.unifiedTransaction.update({
    where: { id: unifiedTransactionId },
    data: {
      categoryId,
      propertyId,
      isTransfer,
      updatedAt: new Date(),
    },
    include: {
      category: true,
      property: true,
      transaction: {
        include: { bankAccount: true },
      },
    },
  });

  return updatedUnifiedTransaction;
}

/**
 * Recategoriza múltiplas transações
 */
export async function bulkCategorizeTransactions(
  transactionIds: string[],
  categoryId: string,
  propertyId?: string
): Promise<
  Array<{
    transactionId: string;
    success: boolean;
    result?: UnifiedTransaction;
    error?: string;
  }>
> {
  const results = [];

  for (const transactionId of transactionIds) {
    try {
      const result = await categorizeTransaction(
        transactionId,
        categoryId,
        propertyId
      );
      results.push({ transactionId, success: true, result });
    } catch (error) {
      results.push({
        transactionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
