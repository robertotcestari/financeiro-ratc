import { prisma } from './client';
import type { ProcessedTransaction } from '@/app/generated/prisma';

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

  // Permitir transações sem categoria (uncategorized)
  // Normalize pseudo id "uncategorized" to null
  const categoryId =
    overrideCategoryId && overrideCategoryId !== 'uncategorized'
      ? overrideCategoryId
      : null;
  const propertyId = overridePropertyId ?? null;

  // Business rule: some categories require an associated property
  if (categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });
    const requiresPropertyNames = new Set<string>([
      'Aluguel',
      'Aluguel de Terceiros',
      'Repasse de Aluguel',
      'Aluguel Pago',
      'Manutenção',
    ]);

    if (category && requiresPropertyNames.has(category.name) && !propertyId) {
      throw new Error('Esta categoria exige um imóvel associado.');
    }
  }

  // Atualiza a ProcessedTransaction existente
  const updatedProcessedTransaction = await prisma.processedTransaction.update({
    where: { id: processedTransactionId },
    data: {
      categoryId,
      propertyId,
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
        categoryId ?? null,
        propertyId ?? null
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
