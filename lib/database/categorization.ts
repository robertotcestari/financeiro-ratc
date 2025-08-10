import prisma from './client';
import type {
  Category,
  Property,
  UnifiedTransaction,
} from '@/app/generated/prisma';
import { CategoryType } from '@/app/generated/prisma';

type RuleApplicationResult = {
  categoryId: string;
  category: Category;
  propertyId?: string | null;
  property?: Property | null;
  isTransfer: boolean;
  ruleApplied: {
    name: string;
  };
};

/**
 * Aplica regras de categorização automática a uma transação
 */
export async function applyCategoryRules(
  transactionId: string
): Promise<RuleApplicationResult | null> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { bankAccount: true },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Busca regras ativas ordenadas por prioridade
  const rules = await prisma.categoryRule.findMany({
    where: { isActive: true },
    include: {
      category: true,
      property: true,
    },
    orderBy: { priority: 'desc' },
  });

  const description = transaction.description.toLowerCase();
  const amount = Number(transaction.amount);

  for (const rule of rules) {
    let matches = true;

    // Verifica padrão na descrição
    if (rule.descriptionPattern) {
      const patterns = rule.descriptionPattern.toLowerCase().split('|');
      const hasMatch = patterns.some((pattern) =>
        description.includes(pattern.trim())
      );
      if (!hasMatch) matches = false;
    }

    // Verifica faixa de valores
    if (rule.minAmount && amount < Number(rule.minAmount)) matches = false;
    if (rule.maxAmount && amount > Number(rule.maxAmount)) matches = false;

    // Verifica conta bancária
    if (
      rule.bankAccountId &&
      rule.bankAccountId !== transaction.bankAccountId
    ) {
      matches = false;
    }

    if (matches) {
      // Aplica a regra
      return {
        categoryId: rule.categoryId,
        category: rule.category,
        propertyId: rule.propertyId,
        property: rule.property,
        isTransfer:
          rule.isTransferRule || rule.category.type === CategoryType.TRANSFER,
        ruleApplied: rule,
      };
    }
  }

  // Nenhuma regra aplicada
  return null;
}

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
    include: { transaction: true }
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
      autoCategorized: false, // É categorização manual
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

/**
 * Sugere categorização baseada em transações similares
 */
export async function suggestCategorization(unifiedTransactionId: string): Promise<
  Array<{
    category: Category;
    property: Property | null;
    count: number;
    avgAmount: number;
    confidence: number;
  }>
> {
  const unifiedTransaction = await prisma.unifiedTransaction.findUnique({
    where: { id: unifiedTransactionId },
    include: { transaction: true }
  });
  
  if (!unifiedTransaction) {
    throw new Error('Unified transaction not found');
  }
  
  const transaction = unifiedTransaction.transaction;

  const description = transaction.description.toLowerCase();
  const amount = Number(transaction.amount);

  // Busca transações similares já categorizadas
  const similarTransactions = await prisma.unifiedTransaction.findMany({
    where: {
      isReviewed: true, // Só considera transações revisadas manualmente
      transaction: {
        description: {
          contains: description.split(' ')[0], // Primeira palavra da descrição
        },
      },
    },
    include: {
      category: true,
      property: true,
      transaction: true,
    },
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Agrupa por categoria para encontrar a mais comum
  const categoryCount = new Map<
    string,
    {
      category: Category;
      property: Property | null;
      count: number;
      avgAmount: number;
    }
  >();

  for (const similar of similarTransactions) {
    const key = `${similar.categoryId}-${similar.propertyId || 'null'}`;
    const similarAmount = Number(similar.transaction.amount);

    if (categoryCount.has(key)) {
      const existing = categoryCount.get(key)!;
      existing.count += 1;
      existing.avgAmount = (existing.avgAmount + similarAmount) / 2;
    } else {
      categoryCount.set(key, {
        category: similar.category,
        property: similar.property,
        count: 1,
        avgAmount: similarAmount,
      });
    }
  }

  // Ordena por frequência e proximidade do valor
  const suggestions = Array.from(categoryCount.values())
    .map((item) => ({
      ...item,
      confidence:
        item.count * 10 + Math.max(0, 50 - Math.abs(item.avgAmount - amount)),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  return suggestions.slice(0, 3); // Retorna top 3 sugestões
}
