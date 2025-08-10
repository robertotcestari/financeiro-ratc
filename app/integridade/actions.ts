'use server';

import { PrismaClient } from '@/app/generated/prisma';

const prisma = new PrismaClient();

export interface AccountBalance {
  bankAccountId: string;
  accountName: string;
  bankName: string;
  amount: number;
}

export interface AccountBalanceRecord {
  bankAccountId: string;
  accountName: string;
  balance: number;
  date: Date;
}

export interface IntegrityStats {
  transactionCount: number;
  unifiedCount: number;
  uncategorizedCount: number;
}

export interface TransferStats {
  totalTransfers: number;
  completeTransfers: number;
  incompleteTransfers: number;
  totalAmount: number;
}

export interface RecentActivity {
  bankAccountId: string;
  accountName: string;
  transactionCount: number;
  amount: number;
}

export interface FinancialIntegrityData {
  transactionsByAccount: AccountBalance[];
  totalTransactions: number;
  latestBalances: AccountBalanceRecord[];
  totalBalances: number;
  difference: number;
  percentDiff: number;
  integrityStats: IntegrityStats;
  transferStats: TransferStats;
  recentActivity: RecentActivity[];
  unifiedWithoutCategory: number;
}

type DateWhere = { date?: { gte?: Date; lte?: Date } } | undefined;

export async function getFinancialIntegrityData(
  year?: number,
  month?: number
): Promise<FinancialIntegrityData> {
  try {
    // Configurar filtro de data
    let dateFilter: DateWhere = undefined;
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // 1. Buscar soma total de todas as transações brutas por conta
    const transactionsByAccount = await prisma.transaction.groupBy({
      by: ['bankAccountId'],
      where: dateFilter,
      _sum: {
        amount: true,
      },
    });

    // 2. Buscar informações das contas bancárias
    const bankAccounts = await prisma.bankAccount.findMany({
      select: {
        id: true,
        name: true,
        bankName: true,
      },
    });

    // 3. Criar mapa de contas para facilitar lookup
    const accountMap = new Map(bankAccounts.map((acc) => [acc.id, acc]));

    // 4. Processar transações por conta
    let totalTransactions = 0;
    const processedTransactions: AccountBalance[] = [];

    for (const accountSum of transactionsByAccount) {
      const account = accountMap.get(accountSum.bankAccountId);
      const amount = Number(accountSum._sum.amount || 0);
      totalTransactions += amount;

      if (account) {
        processedTransactions.push({
          bankAccountId: accountSum.bankAccountId,
          accountName: account.name,
          bankName: account.bankName,
          amount,
        });
      }
    }

    // 5. Calcular "saldos" baseados no mesmo período das transações
    let totalBalances = 0;
    const processedBalances: AccountBalanceRecord[] = [];

    if (dateFilter) {
      // Com filtro de data: usar a mesma soma das transações
      totalBalances = totalTransactions;

      // Para compatibilidade com a interface, criar registros baseados nas transações do período
      for (const accountSum of transactionsByAccount) {
        const account = accountMap.get(accountSum.bankAccountId);
        const amount = Number(accountSum._sum.amount || 0);

        if (account) {
          processedBalances.push({
            bankAccountId: accountSum.bankAccountId,
            accountName: account.name,
            balance: amount,
            date: dateFilter.date!.lte!,
          });
        }
      }
    } else {
      // Sem filtro: buscar o saldo mais recente de cada conta
      const latestBalances = await prisma.$queryRaw<
        Array<{
          bankAccountId: string;
          balance: number;
          date: Date;
        }>
      >`
        SELECT ab.bankAccountId, ab.balance, ab.date
        FROM account_balances ab
        INNER JOIN (
          SELECT bankAccountId, MAX(date) as maxDate
          FROM account_balances
          GROUP BY bankAccountId
        ) latest ON ab.bankAccountId = latest.bankAccountId AND ab.date = latest.maxDate
      `;

      for (const balance of latestBalances) {
        const account = accountMap.get(balance.bankAccountId);
        const balanceValue = Number(balance.balance);
        totalBalances += balanceValue;

        if (account) {
          processedBalances.push({
            bankAccountId: balance.bankAccountId,
            accountName: account.name,
            balance: balanceValue,
            date: balance.date,
          });
        }
      }
    }

    // 7. Calcular diferença
    const difference = Math.abs(totalTransactions - totalBalances);
    const percentDiff =
      totalBalances !== 0 ? (difference / Math.abs(totalBalances)) * 100 : 0;

    // 8. Estatísticas de categorização
    let unifiedCount: number;
    if (dateFilter && year && month) {
      unifiedCount = await prisma.unifiedTransaction.count({
        where: {
          year: year,
          month: month,
        },
      });
    } else if (dateFilter && year) {
      unifiedCount = await prisma.unifiedTransaction.count({
        where: {
          year: year,
        },
      });
    } else {
      unifiedCount = await prisma.unifiedTransaction.count();
    }

    const transactionCount = await prisma.transaction.count({
      where: dateFilter,
    });

    const integrityStats: IntegrityStats = {
      transactionCount,
      unifiedCount,
      uncategorizedCount: transactionCount - unifiedCount,
    };

    // 9. Verificar transferências
    const transfers = await prisma.transfer.findMany({
      where: dateFilter
        ? {
            date: dateFilter.date,
          }
        : undefined,
      select: {
        amount: true,
        isComplete: true,
      },
    });

    const completeTransfers = transfers.filter((t) => t.isComplete);
    const incompleteTransfers = transfers.filter((t) => !t.isComplete);
    const totalTransferAmount = transfers.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const transferStats: TransferStats = {
      totalTransfers: transfers.length,
      completeTransfers: completeTransfers.length,
      incompleteTransfers: incompleteTransfers.length,
      totalAmount: totalTransferAmount,
    };

    // 10. Verificar transações unificadas sem categoria
    let allUnified: Array<{ categoryId: string }>;
    if (dateFilter && year && month) {
      allUnified = await prisma.unifiedTransaction.findMany({
        where: {
          year: year,
          month: month,
        },
        select: {
          categoryId: true,
        },
      });
    } else if (dateFilter && year) {
      allUnified = await prisma.unifiedTransaction.findMany({
        where: {
          year: year,
        },
        select: {
          categoryId: true,
        },
      });
    } else {
      allUnified = await prisma.unifiedTransaction.findMany({
        select: {
          categoryId: true,
        },
      });
    }
    const unifiedWithoutCategory = allUnified.filter(
      (u) => !u.categoryId
    ).length;

    // 11. Análise por período (para compatibilidade, retornamos array vazio)
    const recentActivity: RecentActivity[] = [];

    return {
      transactionsByAccount: processedTransactions,
      totalTransactions,
      latestBalances: processedBalances,
      totalBalances,
      difference,
      percentDiff,
      integrityStats,
      transferStats,
      recentActivity,
      unifiedWithoutCategory,
    };
  } finally {
    await prisma.$disconnect();
  }
}
