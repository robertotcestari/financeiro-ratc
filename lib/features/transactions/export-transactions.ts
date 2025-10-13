import { prisma } from '@/lib/core/database/client';
import { isPendingTransaction } from '@/lib/core/database/transactions';
import {
  buildProcessedTransactionWhere,
  TRANSACTION_ORDER_BY,
} from '@/app/(protected)/transacoes/utils/filters';
import type { TransactionSearchParams } from '@/app/(protected)/transacoes/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getTypeFullLabel } from '@/app/(protected)/transacoes/components/transaction-table/utils/transaction-helpers';
import { createCsvStream, sanitizeCsvValue } from '@/lib/utils/csv-export';
import type { Readable } from 'node:stream';

const CSV_HEADERS = [
  'ID',
  'Data',
  'Descrição original',
  'Detalhes',
  'Categoria',
  'Tipo',
  'Propriedade',
  'Conta',
  'Banco',
  'Valor',
  'Status',
  'Sugestões pendentes',
];

interface ExportTransactionRow {
  id: string;
  date: string;
  description: string;
  details: string;
  category: string;
  type: string;
  property: string;
  account: string;
  bank: string;
  amount: string;
  status: string;
  hasPendingSuggestions: string;
}

function mapTransactionToRow(transaction: {
  id: string;
  isReviewed: boolean;
  categoryId: string | null;
  transactionId: string | null;
  details: string | null;
  category: {
    id: string;
    name: string;
    type: string;
    parent: { name: string } | null;
  } | null;
  property: { code: string; city: string } | null;
  transaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    bankAccount: {
      name: string;
      bankName: string;
    };
  } | null;
  suggestions: Array<{ id: string }>;
}): ExportTransactionRow {
  const isPending = isPendingTransaction({
    isReviewed: transaction.isReviewed,
    categoryId: transaction.categoryId,
    transactionId: transaction.transactionId,
  });

  const hasPendingSuggestions = transaction.suggestions.length > 0;

  const categoryLabel = transaction.category
    ? transaction.category.parent
      ? `${transaction.category.parent.name} > ${transaction.category.name}`
      : transaction.category.name
    : 'Sem Categoria';

  const propertyLabel = transaction.property
    ? `${transaction.property.code} - ${transaction.property.city}`
    : '';

  const typeLabel = transaction.category
    ? getTypeFullLabel(transaction.category.type)
    : 'Sem Categoria';

  const dateLabel = transaction.transaction
    ? formatDate(transaction.transaction.date)
    : '';

  const amountValue = transaction.transaction
    ? formatCurrency(Number(transaction.transaction.amount))
    : formatCurrency(0);

  return {
    id: transaction.id,
    date: dateLabel,
    description: transaction.transaction?.description ?? '(sem transação bancária)',
    details: transaction.details ?? '',
    category: categoryLabel,
    type: typeLabel,
    property: propertyLabel,
    account: transaction.transaction?.bankAccount.name ?? 'N/D',
    bank: transaction.transaction?.bankAccount.bankName ?? 'N/D',
    amount: amountValue,
    status: isPending ? 'Pendente' : 'Revisado',
    hasPendingSuggestions: hasPendingSuggestions ? 'Sim' : 'Não',
  };
}

export async function fetchTransactionsForExport(
  filters: TransactionSearchParams
) {
  const where = buildProcessedTransactionWhere(filters);

  const transactions = await prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      category: {
        include: {
          parent: true,
        },
      },
      property: true,
      suggestions: {
        where: { isApplied: false },
        select: { id: true },
      },
    },
    orderBy: TRANSACTION_ORDER_BY,
  });

  return transactions.map((transaction) => {
    const plain = {
      ...transaction,
      transaction: transaction.transaction
        ? {
            ...transaction.transaction,
            amount: Number(transaction.transaction.amount),
          }
        : null,
    };
    return mapTransactionToRow(plain);
  });
}

export function buildTransactionsCsvStream(
  rows: ExportTransactionRow[]
): Readable {
  const csvRows = rows.map((row) =>
    CSV_HEADERS.map((header) => {
      switch (header) {
        case 'ID':
          return sanitizeCsvValue(row.id);
        case 'Data':
          return sanitizeCsvValue(row.date);
        case 'Descrição original':
          return sanitizeCsvValue(row.description);
        case 'Detalhes':
          return sanitizeCsvValue(row.details);
        case 'Categoria':
          return sanitizeCsvValue(row.category);
        case 'Tipo':
          return sanitizeCsvValue(row.type);
        case 'Propriedade':
          return sanitizeCsvValue(row.property);
        case 'Conta':
          return sanitizeCsvValue(row.account);
        case 'Banco':
          return sanitizeCsvValue(row.bank);
        case 'Valor':
          return sanitizeCsvValue(row.amount);
        case 'Status':
          return sanitizeCsvValue(row.status);
        case 'Sugestões pendentes':
          return sanitizeCsvValue(row.hasPendingSuggestions);
        default:
          return '';
      }
    })
  );

  return createCsvStream({
    headers: CSV_HEADERS,
    rows: csvRows,
    delimiter: ';',
    includeBom: true,
  });
}

export function buildTransactionsExportFilename(filters: TransactionSearchParams) {
  const year = filters.ano ? filters.ano.padStart(4, '0') : 'todos-anos';
  const month = filters.mes ? filters.mes.padStart(2, '0') : 'todos-meses';

  return `transacoes_${year}_${month}.csv`;
}
