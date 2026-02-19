import { prisma } from './client';
import type {
  Transaction as Tx,
  ProcessedTransaction as PTx,
  Category,
  BankAccount,
  Property,
} from '@/app/generated/prisma';
import { CategoryType } from '@/app/generated/prisma';

export interface AccountBalanceResult {
  bankAccountId: string;
  date: Date;
  balance: number | null;
  bankAccount: BankAccount;
}

type CategoryWithParent = Category & { parent?: Category | null };

/**
 * Determina se uma ProcessedTransaction está pendente
 * Pendentes: isReviewed=false OU categoryId=null OU transactionId=null
 */
export function isPendingTransaction(t: {
  isReviewed: boolean;
  categoryId: string | null;
  transactionId: string | null;
}): boolean {
  return !t.isReviewed || t.categoryId === null || t.transactionId === null;
}

/**
 * Busca todas as transações processadas por período
 */
export async function getProcessedTransactionsByPeriod(
  year: number,
  month?: number
): Promise<
  (PTx & {
    transaction: (Tx & { bankAccount: BankAccount }) | null;
    category: Category | null;
    property: Property | null;
  })[]
> {
  const where = month ? { year, month } : { year };

  return prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      category: true,
      property: true,
    },
    orderBy: [{ transaction: { date: 'desc' } }],
  });
}

/**
 * Busca transações por categoria e período
 */
export async function getTransactionsByCategory(
  categoryId: string,
  year: number,
  month?: number
): Promise<
  (PTx & {
    transaction: (Tx & { bankAccount: BankAccount }) | null;
    property: Property | null;
  })[]
> {
  const where = {
    categoryId,
    year,
    ...(month && { month }),
  };

  return prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      property: true,
    },
    orderBy: [{ transaction: { date: 'desc' } }],
  });
}

/**
 * Calcula totais por categoria para o DRE
 */
export async function getDRETotalsByPeriod(
  year: number,
  month?: number
): Promise<
  Array<{
    category: CategoryWithParent;
    total: number;
    transactionCount: number;
  }>
> {
  const where = {
    year,
    ...(month && { month }),
    isTransfer: false, // Exclui transferências do DRE
  };

  const transactions = await prisma.processedTransaction.findMany({
    where,
    include: {
      transaction: true,
      category: {
        include: {
          parent: true,
        },
      },
    },
  });

  // Agrupa por categoria
  const totals = new Map<
    string,
    {
      category: CategoryWithParent;
      total: number;
      transactionCount: number;
    }
  >();

  for (const transaction of transactions) {
    // Guard against nullable relations
    if (!transaction.transaction) continue;
    if (!transaction.category || !transaction.categoryId) continue;

    const categoryId = transaction.categoryId;
    const amount = Number(transaction.transaction.amount);

    if (totals.has(categoryId)) {
      const existing = totals.get(categoryId)!;
      existing.total += amount;
      existing.transactionCount += 1;
    } else {
      totals.set(categoryId, {
        category: transaction.category,
        total: amount,
        transactionCount: 1,
      });
    }
  }

  return Array.from(totals.values()).sort(
    (a, b) => a.category.orderIndex - b.category.orderIndex
  );
}

/**
 * Busca saldos por conta em uma data específica
 */
export async function getAccountBalances(
  date?: Date
): Promise<AccountBalanceResult[]> {
  const targetDate = date || new Date();

  // Fetch all active bank accounts
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // For each account, compute balance as the sum of all transaction amounts up to the target date
  const results: AccountBalanceResult[] = [];
  for (const ba of bankAccounts) {
    const latestTx = await prisma.transaction.findFirst({
      where: {
        bankAccountId: ba.id,
        date: { lte: targetDate },
      },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      select: { date: true },
    });

    const sumResult = await prisma.transaction.aggregate({
      where: {
        bankAccountId: ba.id,
        date: { lte: targetDate },
      },
      _sum: { amount: true },
    });

    const balance = sumResult._sum.amount != null ? Number(sumResult._sum.amount) : null;

    results.push({
      bankAccountId: ba.id,
      date: latestTx?.date ?? targetDate,
      balance,
      bankAccount: ba,
    });
  }

  return results;
}

/**
 * Valida se transferências somam zero
 * Observação: o modelo Transfer não existe no schema atual. Esta função retorna stub.
 */
export async function validateTransferBalance(): Promise<{
  isValid: boolean;
  message: string;
  originAmount: number;
  destinationAmount: number;
  difference: number;
}> {
  return {
    isValid: false,
    message: 'Transfer model not available in current schema',
    originAmount: 0,
    destinationAmount: 0,
    difference: 0,
  };
}

/**
 * Encontra possíveis transferências não identificadas
 */
export async function findPotentialTransfers(dateRange: {
  start: Date;
  end: Date;
}): Promise<unknown[]> {
  // Busca transações sem categorização ou categorizadas como transferência
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      OR: [
        { processedTransaction: null },
        {
          processedTransaction: {
            category: {
              type: CategoryType.TRANSFER,
            },
          },
        },
      ],
    },
    include: {
      bankAccount: true,
      processedTransaction: {
        include: { category: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Identifica possíveis pares de transferência
  const potentialPairs: Array<{
    origin: unknown;
    destination?: unknown;
    confidence: number;
  }> = [];

  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const amount = Number(transaction.amount);

    if (amount >= 0) continue; // Só procura por saídas (valores negativos)

    // Procura por entrada correspondente
    for (let j = 0; j < transactions.length; j++) {
      if (i === j) continue;

      const candidate = transactions[j];
      const candidateAmount = Number(candidate.amount);

      if (candidateAmount <= 0) continue; // Só considera entradas (valores positivos)

      // Verifica se os valores batem (com tolerância)
      const difference = Math.abs(Math.abs(amount) - candidateAmount);
      if (difference > 0.01) continue;

      // Verifica se as datas são próximas (até 3 dias de diferença)
      const timeDiff = Math.abs(
        transaction.date.getTime() - candidate.date.getTime()
      );
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      if (daysDiff > 3) continue;

      // Calcula confiança baseada na proximidade da data
      const confidence = Math.max(0, 100 - daysDiff * 10);

      potentialPairs.push({
        origin: transaction,
        destination: candidate,
        confidence,
      });
    }
  }

  return potentialPairs.sort((a, b) => b.confidence - a.confidence) as unknown[];
}
