import { prisma } from './client';
import { Decimal } from '@prisma/client/runtime/library';
import type { AccountSnapshot } from '../../app/generated/prisma';

/**
 * Interface para resultado de cálculo de snapshot
 */
interface SnapshotCalculation {
  openingBalance: Decimal;
  closingBalance: Decimal;
  totalDebits: Decimal;
  totalCredits: Decimal;
  transactionCount: number;
}

/**
 * Calcula os dados do snapshot para um período específico
 */
export async function calculateSnapshotData(
  bankAccountId: string,
  year: number,
  month: number
): Promise<SnapshotCalculation> {
  // Data de início e fim do mês
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const sumResult = await prisma.transaction.aggregate({
    where: {
      bankAccountId,
      date: { lt: startDate },
    },
    _sum: { amount: true },
  });
  const openingBalance = sumResult._sum.amount || new Decimal(0);

  // Busca todas as transações do mês
  const monthTransactions = await prisma.transaction.findMany({
    where: {
      bankAccountId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Calcula totais
  let totalDebits = new Decimal(0);
  let totalCredits = new Decimal(0);
  let runningBalance = openingBalance;

  for (const transaction of monthTransactions) {
    const amount = transaction.amount;
    runningBalance = runningBalance.plus(amount);

    if (amount.lessThan(0)) {
      totalDebits = totalDebits.plus(amount.abs());
    } else {
      totalCredits = totalCredits.plus(amount);
    }
  }

  return {
    openingBalance,
    closingBalance: runningBalance,
    totalDebits,
    totalCredits,
    transactionCount: monthTransactions.length,
  };
}

/**
 * Cria ou atualiza um snapshot para um período específico
 */
export async function createOrUpdateSnapshot(
  bankAccountId: string,
  year: number,
  month: number,
  options?: { isVerified?: boolean; notes?: string }
): Promise<AccountSnapshot> {
  const snapshotData = await calculateSnapshotData(bankAccountId, year, month);

  return prisma.accountSnapshot.upsert({
    where: {
      bankAccountId_year_month: {
        bankAccountId,
        year,
        month,
      },
    },
    create: {
      bankAccountId,
      year,
      month,
      ...snapshotData,
      lastSyncedAt: new Date(),
      isVerified: options?.isVerified || false,
      notes: options?.notes,
    },
    update: {
      ...snapshotData,
      lastSyncedAt: new Date(),
      isVerified: options?.isVerified,
      notes: options?.notes,
    },
    include: {
      bankAccount: true,
    },
  });
}

/**
 * Gera snapshots para todos os meses com transações
 */
export async function generateAllSnapshots(
  bankAccountId?: string
): Promise<AccountSnapshot[]> {
  // Determina as contas a processar
  const accountFilter = bankAccountId
    ? { id: bankAccountId, isActive: true }
    : { isActive: true };

  const accounts = await prisma.bankAccount.findMany({
    where: accountFilter,
  });

  const snapshots: AccountSnapshot[] = [];

  for (const account of accounts) {
    // Busca o período de transações da conta
    const dateRange = await prisma.transaction.aggregate({
      where: { bankAccountId: account.id },
      _min: { date: true },
      _max: { date: true },
    });

    if (!dateRange._min.date || !dateRange._max.date) {
      continue;
    }

    const startDate = new Date(dateRange._min.date);
    const endDate = new Date(dateRange._max.date);

    // Gera snapshots para cada mês no período
    const currentDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      const snapshot = await createOrUpdateSnapshot(account.id, year, month);
      snapshots.push(snapshot);

      // Avança para o próximo mês
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return snapshots;
}

/**
 * Busca o snapshot mais recente para uma conta
 */
export async function getLatestSnapshot(
  bankAccountId: string
): Promise<AccountSnapshot | null> {
  return prisma.accountSnapshot.findFirst({
    where: { bankAccountId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      bankAccount: true,
    },
  });
}

/**
 * Busca snapshots por período
 */
export async function getSnapshotsByPeriod(
  year: number,
  month?: number,
  bankAccountId?: string
): Promise<AccountSnapshot[]> {
  const where: {
    year: number;
    month?: number;
    bankAccountId?: string;
  } = { year };

  if (month) {
    where.month = month;
  }

  if (bankAccountId) {
    where.bankAccountId = bankAccountId;
  }

  return prisma.accountSnapshot.findMany({
    where,
    include: {
      bankAccount: true,
    },
    orderBy: [
      { bankAccount: { name: 'asc' } },
      { year: 'asc' },
      { month: 'asc' },
    ],
  });
}

/**
 * Valida a integridade de um snapshot comparando com cálculo em tempo real
 */
export async function validateSnapshot(snapshotId: string): Promise<{
  isValid: boolean;
  snapshot: AccountSnapshot;
  calculated: SnapshotCalculation;
  differences: {
    openingBalance: number;
    closingBalance: number;
    totalDebits: number;
    totalCredits: number;
    transactionCount: number;
  };
}> {
  const snapshot = await prisma.accountSnapshot.findUniqueOrThrow({
    where: { id: snapshotId },
    include: { bankAccount: true },
  });

  const calculated = await calculateSnapshotData(
    snapshot.bankAccountId,
    snapshot.year,
    snapshot.month
  );

  const differences = {
    openingBalance: snapshot.openingBalance
      .minus(calculated.openingBalance)
      .toNumber(),
    closingBalance: snapshot.closingBalance
      .minus(calculated.closingBalance)
      .toNumber(),
    totalDebits: snapshot.totalDebits.minus(calculated.totalDebits).toNumber(),
    totalCredits: snapshot.totalCredits
      .minus(calculated.totalCredits)
      .toNumber(),
    transactionCount: snapshot.transactionCount - calculated.transactionCount,
  };

  const isValid =
    Math.abs(differences.openingBalance) < 0.01 &&
    Math.abs(differences.closingBalance) < 0.01 &&
    Math.abs(differences.totalDebits) < 0.01 &&
    Math.abs(differences.totalCredits) < 0.01 &&
    differences.transactionCount === 0;

  return {
    isValid,
    snapshot,
    calculated,
    differences,
  };
}

/**
 * Remove snapshots órfãos (sem transações correspondentes)
 */
export async function cleanupOrphanSnapshots(): Promise<number> {
  // Busca todos os snapshots
  const allSnapshots = await prisma.accountSnapshot.findMany();

  let deletedCount = 0;

  for (const snapshot of allSnapshots) {
    // Verifica se existem transações para o período
    const transactionCount = await prisma.transaction.count({
      where: {
        bankAccountId: snapshot.bankAccountId,
        date: {
          gte: new Date(snapshot.year, snapshot.month - 1, 1),
          lte: new Date(snapshot.year, snapshot.month, 0, 23, 59, 59, 999),
        },
      },
    });

    // Remove snapshot se não houver transações
    if (transactionCount === 0) {
      await prisma.accountSnapshot.delete({
        where: { id: snapshot.id },
      });
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Marca um snapshot como verificado
 */
export async function verifySnapshot(
  snapshotId: string,
  notes?: string
): Promise<AccountSnapshot> {
  return prisma.accountSnapshot.update({
    where: { id: snapshotId },
    data: {
      isVerified: true,
      notes,
      updatedAt: new Date(),
    },
    include: {
      bankAccount: true,
    },
  });
}
