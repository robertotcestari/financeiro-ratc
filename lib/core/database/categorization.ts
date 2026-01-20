import { prisma } from './client';
import type { Prisma, ProcessedTransaction } from '@/app/generated/prisma';

/**
 * Categoriza uma transação processada por ID
 */
export async function categorizeTransaction(
  processedTransactionId: string,
  overrideCategoryId?: string | null,
  overridePropertyId?: string | null
): Promise<ProcessedTransaction> {
  const processedTransaction = await prisma.processedTransaction.findUnique({
    where: { id: processedTransactionId },
    include: { transaction: true },
  });

  if (!processedTransaction) {
    throw new Error('Processed transaction not found');
  }

  // Monta dinamicamente os campos a serem atualizados, respeitando undefined (não altera)
  const data: Prisma.ProcessedTransactionUpdateInput = { updatedAt: new Date() };
  // Permitir transações sem categoria (uncategorized) - null limpa, undefined mantém
  if (overrideCategoryId !== undefined) {
    data.categoryId =
      overrideCategoryId && overrideCategoryId !== 'uncategorized'
        ? overrideCategoryId
        : null;
  }
  // Propriedade: null limpa, undefined mantém
  if (overridePropertyId !== undefined) {
    data.propertyId = overridePropertyId ?? null;
  }

  // Atualiza a ProcessedTransaction existente apenas com campos fornecidos
  const updatedProcessedTransaction = await prisma.processedTransaction.update({
    where: { id: processedTransactionId },
    data,
    include: {
      category: true,
      property: true,
      transaction: {
        include: { bankAccount: true },
      },
    },
  });

  return updatedProcessedTransaction;
}

/**
 * Recategoriza múltiplas transações
 */
export async function bulkCategorizeTransactions(
  transactionIds: string[],
  categoryId?: string | null,
  propertyId?: string | null
): Promise<
  Array<{
    transactionId: string;
    success: boolean;
    result?: ProcessedTransaction;
    error?: string;
  }>
> {
  const results: Array<{
    transactionId: string;
    success: boolean;
    result?: ProcessedTransaction;
    error?: string;
  }> = [];

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
