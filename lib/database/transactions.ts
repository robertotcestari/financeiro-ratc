import { prisma } from './client';
import type {
  AccountBalance,
  Transaction as Tx,
  UnifiedTransaction as UTx,
  Category,
  BankAccount,
  Transfer as TransferModel,
  Property,
} from '@/app/generated/prisma';
import { CategoryType } from '@/app/generated/prisma';

type CategoryWithParent = Category & { parent?: Category | null };

/**
 * Busca todas as transações unificadas por período
 */
export async function getUnifiedTransactionsByPeriod(
  year: number,
  month?: number
): Promise<
  (UTx & {
    transaction: Tx & { bankAccount: BankAccount };
    category: Category;
    property: Property | null;
    transfer: TransferModel | null;
  })[]
> {
  const where = month ? { year, month } : { year };

  return prisma.unifiedTransaction.findMany({
    where,
    include: {
      transaction: {
        include: {
          bankAccount: true,
        },
      },
      category: true,
      property: true,
      transfer: true,
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
  (UTx & {
    transaction: Tx & { bankAccount: BankAccount };
    property: Property | null;
  })[]
> {
  const where = {
    categoryId,
    year,
    ...(month && { month }),
  };

  return prisma.unifiedTransaction.findMany({
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

  const transactions = await prisma.unifiedTransaction.findMany({
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
): Promise<(AccountBalance & { bankAccount: BankAccount })[]> {
  const targetDate = date || new Date();

  return prisma.accountBalance.findMany({
    where: {
      date: {
        lte: targetDate,
      },
    },
    include: {
      bankAccount: true,
    },
    orderBy: [{ bankAccountId: 'asc' }, { date: 'desc' }],
  });
}

/**
 * Valida se transferências somam zero
 */
export async function validateTransferBalance(transferId: string): Promise<{
  isValid: boolean;
  message: string;
  originAmount: number;
  destinationAmount: number;
  difference: number;
}> {
  const transfer = await prisma.transfer.findUnique({
    where: { id: transferId },
    include: {
      originTransaction: true,
      destinationTransaction: true,
    },
  });

  if (!transfer) {
    throw new Error('Transfer not found');
  }

  if (!transfer.isComplete || !transfer.destinationTransaction) {
    const originAmount = transfer.originTransaction
      ? Number(transfer.originTransaction.amount)
      : 0;
    const destinationAmount = transfer.destinationTransaction
      ? Number(transfer.destinationTransaction.amount)
      : 0;
    const sum = originAmount + destinationAmount;
    return {
      isValid: false,
      message: 'Transfer incomplete',
      originAmount,
      destinationAmount,
      difference: sum,
    };
  }

  const originAmount = Number(transfer.originTransaction.amount);
  const destinationAmount = Number(transfer.destinationTransaction.amount);
  const sum = originAmount + destinationAmount;

  const isValid = Math.abs(sum) < 0.01; // Tolerância para problemas de ponto flutuante

  return {
    isValid,
    message: isValid ? 'Transfer balanced' : `Transfer unbalanced: ${sum}`,
    originAmount,
    destinationAmount,
    difference: sum,
  };
}

/**
 * Encontra possíveis transferências não identificadas
 */
export async function findPotentialTransfers(dateRange: {
  start: Date;
  end: Date;
}): Promise<
  Array<{
    origin: Tx & {
      bankAccount: BankAccount;
      unifiedTransaction: (UTx & { category: Category }) | null;
    };
    destination?: Tx & {
      bankAccount: BankAccount;
      unifiedTransaction: (UTx & { category: Category }) | null;
    };
    confidence: number;
  }>
> {
  // Busca transações sem categorização ou categorizadas como transferência
  const transactions = await prisma.transaction.findMany({
    where: {
      date: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      OR: [
        { unifiedTransaction: null },
        {
          unifiedTransaction: {
            category: {
              type: CategoryType.TRANSFER,
            },
          },
        },
      ],
    },
    include: {
      bankAccount: true,
      unifiedTransaction: {
        include: { category: true },
      },
    },
    orderBy: { date: 'asc' },
  });

  // Identifica possíveis pares de transferência
  const potentialPairs: Array<{
    origin: Tx & {
      bankAccount: BankAccount;
      unifiedTransaction: (UTx & { category: Category }) | null;
    };
    destination?: Tx & {
      bankAccount: BankAccount;
      unifiedTransaction: (UTx & { category: Category }) | null;
    };
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

  return potentialPairs.sort((a, b) => b.confidence - a.confidence);
}
