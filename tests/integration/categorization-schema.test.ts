import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/database/client';

describe('Categorization schema integration', () => {
  beforeEach(async () => {
    // Clean up in correct order to satisfy FK constraints
    await prisma.transactionSuggestion.deleteMany();
    await prisma.categorizationRule.deleteMany();
    await prisma.processedTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.bankAccount.deleteMany();
  });

  it('creates category, rule, processedTransaction and transactionSuggestion with relations', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        type: 'EXPENSE',
        level: 1,
        orderIndex: 0,
      },
    });

    const processedTransaction = await prisma.processedTransaction.create({
      data: {
        year: 2025,
        month: 8,
        details: 'test',
        notes: 'note',
      },
    });

    const rule = await prisma.categorizationRule.create({
      data: {
        name: 'Rule 1',
        description: 'desc',
        categoryId: category.id,
        criteria: {},
        priority: 10,
      },
    });

    const suggestion = await prisma.transactionSuggestion.create({
      data: {
        processedTransactionId: processedTransaction.id,
        ruleId: rule.id,
        suggestedCategoryId: category.id,
        confidence: 0.95,
      },
    });

    const loaded = await prisma.transactionSuggestion.findUnique({
      where: { id: suggestion.id },
      include: {
        processedTransaction: true,
        rule: true,
        suggestedCategory: true,
      },
    });

    expect(loaded).toBeDefined();
    expect(loaded?.rule.id).toBe(rule.id);
    expect(loaded?.processedTransaction.id).toBe(processedTransaction.id);
    expect(loaded?.suggestedCategory.id).toBe(category.id);
  });

  it('enforces unique constraint on processedTransactionId+ruleId', async () => {
    const category = await prisma.category.create({
      data: { name: 'Cat2', type: 'INCOME', level: 1, orderIndex: 1 },
    });

    const processedTransaction = await prisma.processedTransaction.create({
      data: { year: 2025, month: 8 },
    });

    const rule = await prisma.categorizationRule.create({
      data: { name: 'Rule2', categoryId: category.id, criteria: {} },
    });

    await prisma.transactionSuggestion.create({
      data: {
        processedTransactionId: processedTransaction.id,
        ruleId: rule.id,
        suggestedCategoryId: category.id,
      },
    });

    await expect(
      prisma.transactionSuggestion.create({
        data: {
          processedTransactionId: processedTransaction.id,
          ruleId: rule.id,
          suggestedCategoryId: category.id,
        },
      })
    ).rejects.toThrow();
  });
});
