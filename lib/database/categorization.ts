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
 * Categoriza uma transação automaticamente
 */
export async function categorizeTransaction(
  transactionId: string,
  overrideCategoryId?: string,
  overridePropertyId?: string
): Promise<UnifiedTransaction> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  let categoryId: string;
  let propertyId: string | null = null;
  let isTransfer = false;
  let autoCategorized = false;
  let ruleApplied: { name: string } | null = null;

  if (overrideCategoryId) {
    // Categorização manual
    categoryId = overrideCategoryId;
    propertyId = overridePropertyId || null;

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });
    isTransfer = category?.type === CategoryType.TRANSFER;
  } else {
    // Categorização automática
    const result = await applyCategoryRules(transactionId);

    if (result) {
      categoryId = result.categoryId;
      propertyId = result.propertyId ?? null;
      isTransfer = result.isTransfer;
      autoCategorized = true;
      ruleApplied = result.ruleApplied;
    } else {
      // Se não encontrou regra, usa categoria padrão
      const defaultCategory = await prisma.category.findFirst({
        where: { name: 'Outras Receitas' },
      });
      if (!defaultCategory) {
        throw new Error('Default category not found');
      }
      categoryId = defaultCategory.id;
    }
  }

  // Cria ou atualiza UnifiedTransaction
  const date = new Date(transaction.date);
  const unifiedTransaction = await prisma.unifiedTransaction.upsert({
    where: { transactionId },
    create: {
      transactionId,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      categoryId,
      propertyId,
      isTransfer,
      autoCategorized,
      details: ruleApplied ? `Regra aplicada: ${ruleApplied.name}` : null,
    },
    update: {
      categoryId,
      propertyId,
      isTransfer,
      autoCategorized,
      details: ruleApplied ? `Regra aplicada: ${ruleApplied.name}` : null,
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

  return unifiedTransaction;
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
export async function suggestCategorization(transactionId: string): Promise<
  Array<{
    category: Category;
    property: Property | null;
    count: number;
    avgAmount: number;
    confidence: number;
  }>
> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

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
