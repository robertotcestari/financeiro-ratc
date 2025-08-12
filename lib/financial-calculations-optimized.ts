import { prisma } from './database/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  getLatestSnapshot,
  createOrUpdateSnapshot,
} from './database/account-snapshots';
import type { BankAccount } from '../app/generated/prisma';

/**
 * Calcula o saldo atual usando snapshots como base para otimização
 * Isso reduz drasticamente a quantidade de transações a somar
 */
export async function getCurrentBalanceOptimized(
  bankAccountId: string,
  targetDate: Date = new Date()
): Promise<{
  balance: number;
  calculatedFrom: 'snapshot' | 'full-calculation';
  snapshotDate?: Date;
  transactionsProcessed: number;
}> {
  // Busca o snapshot mais recente antes da data alvo
  const latestSnapshot = await prisma.accountSnapshot.findFirst({
    where: {
      bankAccountId,
      year: { lte: targetDate.getFullYear() },
      month: { lte: targetDate.getMonth() + 1 },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  if (latestSnapshot) {
    // Calcula a data do snapshot
    const snapshotEndDate = new Date(
      latestSnapshot.year,
      latestSnapshot.month,
      0,
      23,
      59,
      59,
      999
    );

    // Se a data alvo está dentro do mês do snapshot, usa o saldo de abertura + transações até a data
    if (targetDate <= snapshotEndDate) {
      const monthStart = new Date(
        latestSnapshot.year,
        latestSnapshot.month - 1,
        1
      );

      const transactionsInPeriod = await prisma.transaction.aggregate({
        where: {
          bankAccountId,
          date: {
            gte: monthStart,
            lte: targetDate,
          },
        },
        _sum: { amount: true },
        _count: true,
      });

      const balance = latestSnapshot.openingBalance
        .plus(transactionsInPeriod._sum.amount || 0)
        .toNumber();

      return {
        balance,
        calculatedFrom: 'snapshot',
        snapshotDate: snapshotEndDate,
        transactionsProcessed: transactionsInPeriod._count || 0,
      };
    }

    // Se a data alvo é após o snapshot, usa o saldo de fechamento + transações posteriores
    const transactionsAfterSnapshot = await prisma.transaction.aggregate({
      where: {
        bankAccountId,
        date: {
          gt: snapshotEndDate,
          lte: targetDate,
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    const balance = latestSnapshot.closingBalance
      .plus(transactionsAfterSnapshot._sum.amount || 0)
      .toNumber();

    return {
      balance,
      calculatedFrom: 'snapshot',
      snapshotDate: snapshotEndDate,
      transactionsProcessed: transactionsAfterSnapshot._count || 0,
    };
  }

  // Sem snapshot disponível, calcula do zero
  const result = await prisma.transaction.aggregate({
    where: {
      bankAccountId,
      date: { lte: targetDate },
    },
    _sum: { amount: true },
    _count: true,
  });

  return {
    balance: result._sum.amount?.toNumber() || 0,
    calculatedFrom: 'full-calculation',
    transactionsProcessed: result._count || 0,
  };
}

/**
 * Calcula saldo em uma data específica com otimização de snapshots
 */
export async function getBalanceAtDateOptimized(
  bankAccountId: string,
  date: Date
): Promise<number> {
  const result = await getCurrentBalanceOptimized(bankAccountId, date);
  return result.balance;
}

/**
 * Calcula running balance otimizado para um período
 * Usa snapshot como base quando disponível
 */
export async function calculateRunningBalanceOptimized<
  T extends { date: Date; amount: Decimal }
>(
  transactions: T[],
  bankAccountId: string,
  startDate?: Date
): Promise<(T & { balance: number })[]> {
  if (transactions.length === 0) return [];

  // Ordena transações por data
  const sortedTransactions = [...transactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Determina a data inicial
  const firstTransactionDate = startDate || sortedTransactions[0].date;

  // Busca o saldo inicial usando snapshots
  const initialBalanceData = await getCurrentBalanceOptimized(
    bankAccountId,
    new Date(firstTransactionDate.getTime() - 1) // Um milissegundo antes da primeira transação
  );

  let runningBalance = new Decimal(initialBalanceData.balance);

  return sortedTransactions.map((transaction) => {
    runningBalance = runningBalance.plus(transaction.amount);
    return {
      ...transaction,
      balance: runningBalance.toNumber(),
    };
  });
}

/**
 * Busca saldos de múltiplas contas com otimização
 */
export async function getMultipleAccountBalances(
  bankAccountIds?: string[],
  date: Date = new Date()
): Promise<
  Array<{
    bankAccountId: string;
    bankAccount: { name: string; bankName: string };
    balance: number;
    lastUpdate: Date;
    source: 'snapshot' | 'calculation';
  }>
> {
  // Busca todas as contas ativas se não especificado
  const accounts = await prisma.bankAccount.findMany({
    where: bankAccountIds
      ? { id: { in: bankAccountIds }, isActive: true }
      : { isActive: true },
  });

  const balances = await Promise.all(
    accounts.map(async (account: BankAccount) => {
      const balanceData = await getCurrentBalanceOptimized(account.id, date);

      return {
        bankAccountId: account.id,
        bankAccount: {
          name: account.name,
          bankName: account.bankName,
        },
        balance: balanceData.balance,
        lastUpdate: balanceData.snapshotDate || date,
        source:
          balanceData.calculatedFrom === 'snapshot'
            ? ('snapshot' as const)
            : ('calculation' as const),
      };
    })
  );

  return balances;
}

/**
 * Gera snapshot para o mês atual se ainda não existir
 */
export async function ensureCurrentMonthSnapshot(
  bankAccountId: string
): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Verifica se já existe snapshot para o mês atual
  const existingSnapshot = await prisma.accountSnapshot.findUnique({
    where: {
      bankAccountId_year_month: {
        bankAccountId,
        year,
        month,
      },
    },
  });

  // Se não existe ou está desatualizado (mais de 1 dia), recria
  if (
    !existingSnapshot ||
    now.getTime() - existingSnapshot.lastSyncedAt.getTime() >
      24 * 60 * 60 * 1000
  ) {
    await createOrUpdateSnapshot(bankAccountId, year, month);
  }
}

/**
 * Calcula estatísticas de performance dos snapshots
 */
export async function getSnapshotPerformanceStats(
  bankAccountId: string
): Promise<{
  totalTransactions: number;
  totalSnapshots: number;
  averageTransactionsPerSnapshot: number;
  coveragePercentage: number;
  oldestSnapshot?: Date;
  newestSnapshot?: Date;
}> {
  const [transactionCount, snapshots] = await Promise.all([
    prisma.transaction.count({ where: { bankAccountId } }),
    prisma.accountSnapshot.findMany({
      where: { bankAccountId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    }),
  ]);

  if (snapshots.length === 0) {
    return {
      totalTransactions: transactionCount,
      totalSnapshots: 0,
      averageTransactionsPerSnapshot: 0,
      coveragePercentage: 0,
    };
  }

  // Calcula total de transações cobertas por snapshots
  let coveredTransactions = 0;
  for (const snapshot of snapshots) {
    coveredTransactions += snapshot.transactionCount;
  }

  const oldestSnapshot = new Date(snapshots[0].year, snapshots[0].month - 1, 1);
  const newestSnapshot = new Date(
    snapshots[snapshots.length - 1].year,
    snapshots[snapshots.length - 1].month,
    0
  );

  return {
    totalTransactions: transactionCount,
    totalSnapshots: snapshots.length,
    averageTransactionsPerSnapshot: Math.round(
      coveredTransactions / snapshots.length
    ),
    coveragePercentage: Math.round(
      (coveredTransactions / transactionCount) * 100
    ),
    oldestSnapshot,
    newestSnapshot,
  };
}

/**
 * Recomenda períodos que precisam de snapshots para otimização
 */
export async function recommendSnapshotPeriods(
  bankAccountId?: string,
  threshold: number = 100 // Número mínimo de transações para recomendar snapshot
): Promise<
  Array<{
    bankAccountId: string;
    bankAccountName: string;
    year: number;
    month: number;
    transactionCount: number;
    hasSnapshot: boolean;
  }>
> {
  const accounts = bankAccountId
    ? await prisma.bankAccount.findMany({ where: { id: bankAccountId } })
    : await prisma.bankAccount.findMany({ where: { isActive: true } });

  const recommendations: Array<{
    bankAccountId: string;
    bankAccountName: string;
    year: number;
    month: number;
    transactionCount: number;
    hasSnapshot: boolean;
  }> = [];

  for (const account of accounts) {
    // Busca períodos com muitas transações
    const periods = await prisma.$queryRaw<
      Array<{
        year: number;
        month: number;
        transaction_count: bigint;
      }>
    >`
      SELECT 
        YEAR(date) as year,
        MONTH(date) as month,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE bankAccountId = ${account.id}
      GROUP BY YEAR(date), MONTH(date)
      HAVING COUNT(*) >= ${threshold}
      ORDER BY year DESC, month DESC
    `;

    for (const period of periods) {
      // Verifica se já existe snapshot
      const hasSnapshot =
        (await prisma.accountSnapshot.count({
          where: {
            bankAccountId: account.id,
            year: period.year,
            month: period.month,
          },
        })) > 0;

      recommendations.push({
        bankAccountId: account.id,
        bankAccountName: account.name,
        year: period.year,
        month: period.month,
        transactionCount: Number(period.transaction_count),
        hasSnapshot,
      });
    }
  }

  return recommendations.sort((a, b) => {
    // Prioriza períodos sem snapshot e com mais transações
    if (a.hasSnapshot !== b.hasSnapshot) {
      return a.hasSnapshot ? 1 : -1;
    }
    return b.transactionCount - a.transactionCount;
  });
}
