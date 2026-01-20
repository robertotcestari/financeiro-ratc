/**
 * Suggestions Commands
 * List and apply/dismiss categorization suggestions
 */

import type { Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/core/database/client';
import {
  applySuggestions,
  dismissSuggestions,
} from '@/lib/core/database/suggestions';
import {
  printHeader,
  printTable,
  printJson,
  printWarning,
  printInfo,
  printError,
  printSuccess,
  truncate,
  formatDate,
} from '../utils/output';

export interface ListSuggestionsOptions {
  json?: boolean;
  pending?: boolean;
  rule?: string;
  category?: string;
  transaction?: string;
  limit?: number;
}

export interface ApplySuggestionsOptions extends ListSuggestionsOptions {
  ids?: string;
  all?: boolean;
}

export interface DismissSuggestionsOptions extends ListSuggestionsOptions {
  ids?: string;
  all?: boolean;
  yes?: boolean;
}

async function resolveRuleId(nameOrId: string): Promise<string | null> {
  const byId = await prisma.categorizationRule.findUnique({
    where: { id: nameOrId },
  });
  if (byId) return byId.id;
  const byName = await prisma.categorizationRule.findFirst({
    where: { name: { contains: nameOrId } },
  });
  return byName?.id ?? null;
}

async function resolveCategoryId(nameOrId: string): Promise<string | null> {
  const byId = await prisma.category.findUnique({ where: { id: nameOrId } });
  if (byId) return byId.id;
  const byName = await prisma.category.findFirst({
    where: { name: { contains: nameOrId } },
  });
  return byName?.id ?? null;
}

async function resolveProcessedTransactionId(
  transactionIdOrProcessedId: string
): Promise<string | null> {
  const byProcessedId = await prisma.processedTransaction.findUnique({
    where: { id: transactionIdOrProcessedId },
    select: { id: true },
  });
  if (byProcessedId) return byProcessedId.id;
  const byTransaction = await prisma.processedTransaction.findFirst({
    where: { transactionId: transactionIdOrProcessedId },
    select: { id: true },
  });
  return byTransaction?.id ?? null;
}

function buildWhere(
  options: ListSuggestionsOptions
): Prisma.TransactionSuggestionWhereInput | null {
  const where: Prisma.TransactionSuggestionWhereInput = {};
  if (options.pending) {
    where.isApplied = false;
  }
  where.source = 'RULE';
  return where;
}

export async function listSuggestions(options: ListSuggestionsOptions = {}): Promise<void> {
  const where = buildWhere(options);
  if (!where) return;

  if (options.rule) {
    const ruleId = await resolveRuleId(options.rule);
    if (!ruleId) {
      printError(`Regra nao encontrada: ${options.rule}`);
      return;
    }
    where.ruleId = ruleId;
  }

  if (options.category) {
    const categoryId = await resolveCategoryId(options.category);
    if (!categoryId) {
      printError(`Categoria nao encontrada: ${options.category}`);
      return;
    }
    where.suggestedCategoryId = categoryId;
  }

  if (options.transaction) {
    const processedId = await resolveProcessedTransactionId(options.transaction);
    if (!processedId) {
      printError(`Transacao nao encontrada: ${options.transaction}`);
      return;
    }
    where.processedTransactionId = processedId;
  }

  const limit = Math.min(options.limit ?? 50, 500);
  const suggestions = await prisma.transactionSuggestion.findMany({
    where,
    include: {
      suggestedCategory: true,
      suggestedProperty: true,
      rule: true,
      processedTransaction: {
        include: { transaction: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  });

  if (suggestions.length === 0) {
    printWarning('Nenhuma sugestao encontrada.');
    return;
  }

  if (options.json) {
    printJson(suggestions);
    return;
  }

  printHeader('Sugestoes');
  const headers = ['ID', 'Data', 'Descricao', 'Categoria', 'Conf.'];
  const rows = suggestions.map((s) => [
    `${s.id.slice(0, 8)}...`,
    s.processedTransaction?.transaction
      ? formatDate(s.processedTransaction.transaction.date)
      : '-',
    truncate(s.processedTransaction?.transaction?.description || '-', 30),
    s.suggestedCategory?.name || '-',
    `${Math.round(s.confidence * 100)}%`,
  ]);
  printTable(headers, rows);
  printInfo(`Total: ${suggestions.length} sugestao(oes)`);
}

export async function applySuggestionsCommand(
  options: ApplySuggestionsOptions
): Promise<void> {
  let ids: string[] = [];

  if (options.ids) {
    ids = options.ids.split(',').map((id) => id.trim()).filter(Boolean);
  } else if (options.all) {
    const where = buildWhere({ ...options, pending: options.pending ?? true });
    if (!where) return;
    const suggestions = await prisma.transactionSuggestion.findMany({
      where,
      select: { id: true },
      take: 500,
    });
    ids = suggestions.map((s) => s.id);
  } else {
    printError('Informe --ids ou --all.');
    return;
  }

  if (ids.length === 0) {
    printWarning('Nenhuma sugestao para aplicar.');
    return;
  }

  const results = await applySuggestions(ids);
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  if (options.json) {
    printJson({ successCount, failedCount, results });
    return;
  }

  printSuccess(`Sugestoes aplicadas: ${successCount}/${results.length}`);
  if (failedCount > 0) {
    printWarning(`Falhas: ${failedCount}`);
  }
}

export async function dismissSuggestionsCommand(
  options: DismissSuggestionsOptions
): Promise<void> {
  if (!options.yes) {
    printError('Use --yes para confirmar a exclusao.');
    return;
  }

  let ids: string[] = [];

  if (options.ids) {
    ids = options.ids.split(',').map((id) => id.trim()).filter(Boolean);
  } else if (options.all) {
    const where = buildWhere({ ...options, pending: options.pending ?? true });
    if (!where) return;
    const suggestions = await prisma.transactionSuggestion.findMany({
      where,
      select: { id: true },
      take: 500,
    });
    ids = suggestions.map((s) => s.id);
  } else {
    printError('Informe --ids ou --all.');
    return;
  }

  if (ids.length === 0) {
    printWarning('Nenhuma sugestao para descartar.');
    return;
  }

  const results = await dismissSuggestions(ids);
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  if (options.json) {
    printJson({ successCount, failedCount, results });
    return;
  }

  printSuccess(`Sugestoes descartadas: ${successCount}/${results.length}`);
  if (failedCount > 0) {
    printWarning(`Falhas: ${failedCount}`);
  }
}
