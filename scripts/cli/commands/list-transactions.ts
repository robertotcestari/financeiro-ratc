/**
 * List Transactions Command
 * Lists transactions from the database with filters
 */

import { prisma } from '@/lib/core/database/client';
import {
  printHeader,
  printTable,
  printJson,
  printWarning,
  printInfo,
  formatCurrency,
  formatDate,
  truncate,
} from '../utils/output';

export interface ListTransactionsOptions {
  limit?: number;
  account?: string;
  category?: string;
  month?: string; // formato: YYYY-MM
  uncategorized?: boolean;
  json?: boolean;
  verbose?: boolean;
}

export async function listTransactions(options: ListTransactionsOptions = {}): Promise<void> {
  const {
    limit = 50,
    account,
    category,
    month,
    uncategorized,
    json,
    verbose,
  } = options;

  // Build where clause for Transaction
  const where: Record<string, unknown> = {};

  // Build where clause for ProcessedTransaction
  const processedWhere: Record<string, unknown> = {};

  // Filter by account
  if (account) {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { name: { contains: account } },
    });
    if (bankAccount) {
      where.bankAccountId = bankAccount.id;
    } else {
      printWarning(`Conta nao encontrada: ${account}`);
      return;
    }
  }

  // Filter by category - resolve category ID first
  if (category) {
    const categoryRecord = await prisma.category.findFirst({
      where: { name: { contains: category } },
    });
    if (categoryRecord) {
      processedWhere.categoryId = categoryRecord.id;
    } else {
      printWarning(`Categoria nao encontrada: ${category}`);
      return;
    }
  }

  // Filter uncategorized
  if (uncategorized) {
    processedWhere.categoryId = null;
  }

  // Filter by month - apply date range filter
  if (month) {
    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999);
    where.date = {
      gte: startDate,
      lte: endDate,
    };
  }

  // Apply processedTransaction filter if any criteria set
  if (Object.keys(processedWhere).length > 0) {
    where.processedTransaction = processedWhere;
  }

  // Fetch transactions with relations - filters applied at DB level
  const transactions = await prisma.transaction.findMany({
    where,
    take: Math.min(limit, 500), // Cap at 500 to prevent huge queries
    orderBy: { date: 'desc' },
    include: {
      bankAccount: { select: { name: true } },
      processedTransaction: {
        select: {
          category: { select: { id: true, name: true } },
          property: { select: { code: true } },
          isReviewed: true,
          details: true,
        },
      },
    },
  });

  const filtered = transactions;

  if (filtered.length === 0) {
    printWarning('Nenhuma transacao encontrada com os filtros aplicados.');
    return;
  }

  // JSON output
  if (json) {
    const data = filtered.map((t) => ({
      id: t.id,
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      amount: Number(t.amount),
      account: t.bankAccount.name,
      category: t.processedTransaction?.category?.name || null,
      property: t.processedTransaction?.property?.code || null,
      isReviewed: t.processedTransaction?.isReviewed || false,
      details: t.processedTransaction?.details || null,
    }));
    printJson(data);
    return;
  }

  // Table output
  printHeader(`Transacoes (${filtered.length})`);

  if (verbose) {
    // Detailed view
    const headers = [
      'Data',
      'Conta',
      'Descricao',
      'Detalhes',
      'Valor',
      'Categoria',
      'Imovel',
    ];
    const rows = filtered.map((t) => [
      formatDate(t.date),
      truncate(t.bankAccount.name, 12),
      truncate(t.description, 35),
      truncate(t.processedTransaction?.details || '-', 35),
      formatCurrency(Number(t.amount)),
      truncate(t.processedTransaction?.category?.name || '-', 20),
      t.processedTransaction?.property?.code || '-',
    ]);
    printTable(headers, rows);
  } else {
    // Compact view
    const headers = ['Data', 'Descricao', 'Detalhes', 'Valor', 'Categoria'];
    const rows = filtered.map((t) => [
      formatDate(t.date),
      truncate(t.description, 40),
      truncate(t.processedTransaction?.details || '-', 30),
      formatCurrency(Number(t.amount)),
      truncate(t.processedTransaction?.category?.name || '-', 20),
    ]);
    printTable(headers, rows);
  }

  // Summary
  const total = filtered.reduce((sum, t) => sum + Number(t.amount), 0);
  const uncategorizedCount = filtered.filter((t) => !t.processedTransaction?.category).length;

  console.log('');
  printInfo(`Total: ${formatCurrency(total)}`);
  if (uncategorizedCount > 0) {
    printWarning(`Sem categoria: ${uncategorizedCount}`);
  }
}
