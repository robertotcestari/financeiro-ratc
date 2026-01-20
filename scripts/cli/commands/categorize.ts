/**
 * Categorize Command
 * Applies category/property overrides to processed transactions
 */

import { prisma } from '@/lib/core/database/client';
import {
  bulkCategorizeTransactions,
} from '@/lib/core/database/categorization';
import {
  printError,
  printWarning,
  printSuccess,
  printJson,
} from '../utils/output';

export interface CategorizeOptions {
  ids?: string;
  transactions?: string;
  uncategorized?: boolean;
  limit?: number;
  category: string;
  property?: string;
  json?: boolean;
}

async function resolveCategoryId(nameOrId: string): Promise<string | null> {
  if (nameOrId === 'uncategorized') return 'uncategorized';
  const byId = await prisma.category.findUnique({ where: { id: nameOrId } });
  if (byId) return byId.id;
  const byName = await prisma.category.findFirst({
    where: { name: { contains: nameOrId } },
  });
  return byName?.id ?? null;
}

async function resolvePropertyId(codeOrId: string): Promise<string | null> {
  if (codeOrId === 'none' || codeOrId === 'null') return null;
  const byId = await prisma.property.findUnique({ where: { id: codeOrId } });
  if (byId) return byId.id;
  const byCode = await prisma.property.findFirst({
    where: { code: { contains: codeOrId } },
  });
  return byCode?.id ?? null;
}

export async function categorizeTransactions(
  options: CategorizeOptions
): Promise<void> {
  const categoryId = await resolveCategoryId(options.category);
  if (!categoryId) {
    printError(`Categoria nao encontrada: ${options.category}`);
    return;
  }

  let propertyId: string | null | undefined;
  if (options.property !== undefined) {
    propertyId = await resolvePropertyId(options.property);
    if (propertyId === undefined) {
      printError(`Imovel nao encontrado: ${options.property}`);
      return;
    }
  }

  let ids: string[] = [];

  if (options.ids) {
    ids = options.ids.split(',').map((id) => id.trim()).filter(Boolean);
  } else if (options.transactions) {
    const txIds = options.transactions.split(',').map((id) => id.trim()).filter(Boolean);
    const processed = await prisma.processedTransaction.findMany({
      where: { transactionId: { in: txIds } },
      select: { id: true },
    });
    ids = processed.map((p) => p.id);
  } else if (options.uncategorized) {
    const limit = Math.min(options.limit ?? 200, 1000);
    const processed = await prisma.processedTransaction.findMany({
      where: { categoryId: null },
      select: { id: true },
      take: limit,
    });
    ids = processed.map((p) => p.id);
  } else {
    printError('Informe --ids, --transactions ou --uncategorized.');
    return;
  }

  if (ids.length === 0) {
    printWarning('Nenhuma transacao encontrada para categorizar.');
    return;
  }

  const results = await bulkCategorizeTransactions(
    ids,
    categoryId === 'uncategorized' ? null : categoryId,
    propertyId
  );
  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  if (options.json) {
    printJson({ successCount, failedCount, results });
    return;
  }

  printSuccess(`Categorizacao concluida: ${successCount}/${results.length}`);
  if (failedCount > 0) {
    printWarning(`Falhas: ${failedCount}`);
  }
}

