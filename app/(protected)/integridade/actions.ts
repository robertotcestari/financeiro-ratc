'use server';

import { prisma } from '@/lib/core/database/client';
import { Decimal } from '@/app/generated/prisma/runtime/library';
import { generateAllSnapshots } from '@/lib/core/database/account-snapshots';
import { revalidatePath } from 'next/cache';

export async function generateAllAccountSnapshots() {
  try {
    const snapshots = await generateAllSnapshots();
    revalidatePath('/integridade');
    return {
      success: true,
      snapshotCount: snapshots.length,
      message: `${snapshots.length} snapshots gerados com sucesso`
    };
  } catch (error) {
    console.error('Erro ao gerar snapshots:', error);
    return {
      success: false,
      snapshotCount: 0,
      error: error instanceof Error ? error.message : 'Erro ao gerar snapshots'
    };
  }
}

export interface AccountBalance {
  bankAccountId: string;
  accountName: string;
  bankName: string;
  amount: number;
}


export interface IntegrityStats {
  transactionCount: number; // Total de transações brutas
  processedCount: number; // Transações que viraram ProcessedTransaction (com ou sem categoria)
  categorizedCount: number; // ProcessedTransactions que têm categoria
  unprocessedCount: number; // Transações que ainda não viraram ProcessedTransaction
  uncategorizedCount: number; // ProcessedTransactions sem categoria
}

export interface TransferStats {
  totalTransfers: number;
  categorizedTransfers: number;
  uncategorizedTransfers: number;
  netAmount: number; // Valor líquido (deveria ser 0)
  volumeAmount: number; // Volume total (valor absoluto)
}

export interface RecentActivity {
  bankAccountId: string;
  accountName: string;
  transactionCount: number;
  amount: number;
}

export interface UnprocessedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  bankAccountName: string;
  bankName: string;
}

export interface AccountBalanceComparison {
  bankAccountId: string;
  accountName: string;
  bankName: string;
  rawTransactionsBalance: number; // Saldo calculado pelas transações brutas
  processedTransactionsBalance: number; // Saldo calculado pelas transações processadas
  difference: number; // Diferença entre raw e processadas
  processedPercentage: number; // % de transações processadas
}

export interface FinancialIntegrityData {
  transactionsByAccount: AccountBalance[];
  totalTransactions: number;
  integrityStats: IntegrityStats;
  transferStats: TransferStats;
  recentActivity: RecentActivity[];
  unifiedWithoutCategory: number;
  unprocessedTransactions: UnprocessedTransaction[];
  accountBalanceComparisons: AccountBalanceComparison[];
}

type DateWhere = { date?: { gte?: Date; lte?: Date } } | undefined;

export async function processTransactionToUnified(transactionId: string) {
  try {
    // 1. Buscar a transação crua
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        processedTransaction: true, // Verificar se já foi processada
      },
    });

    if (!transaction) {
      throw new Error('Transação não encontrada');
    }

    if (transaction.processedTransaction) {
      throw new Error('Transação já foi processada');
    }

    // 2. Criar a transação processada
    const processedTransaction = await prisma.processedTransaction.create({
      data: {
        transactionId: transaction.id,
        year: transaction.date.getFullYear(),
        month: transaction.date.getMonth() + 1,
        // categoryId será null inicialmente - usuário precisará categorizar depois
        categoryId: null,
        // propertyId será null inicialmente - usuário pode vincular depois
        propertyId: null,
      },
    });

    return { success: true, processedTransactionId: processedTransaction.id };
  } catch (error) {
    console.error('Erro ao processar transação:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

export interface BulkProcessResult {
  success: boolean;
  totalProcessed: number;
  totalFailed: number;
  errors: string[];
}

export async function processAllUnprocessedTransactions(
  year?: number,
  month?: number,
  limit?: number
): Promise<BulkProcessResult> {
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

    // Buscar todas as transações não processadas
    const unprocessedTransactions = await prisma.transaction.findMany({
      where: {
        ...dateFilter,
        processedTransaction: null,
      },
      orderBy: {
        date: 'asc',
      },
      take: limit,
    });

    let totalProcessed = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    // Processar em lotes para melhor performance
    const batchSize = 50;
    for (let i = 0; i < unprocessedTransactions.length; i += batchSize) {
      const batch = unprocessedTransactions.slice(i, i + batchSize);
      
      const processedBatch = await Promise.allSettled(
        batch.map(async (transaction) => {
          try {
            await prisma.processedTransaction.create({
              data: {
                transactionId: transaction.id,
                year: transaction.date.getFullYear(),
                month: transaction.date.getMonth() + 1,
                categoryId: null,
                propertyId: null,
              },
            });
            return { success: true };
          } catch (error) {
            return { 
              success: false, 
              error: `Transação ${transaction.id}: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
            };
          }
        })
      );

      processedBatch.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.success) {
          totalProcessed++;
        } else {
          totalFailed++;
          if (result.status === 'rejected') {
            errors.push(`Erro ao processar: ${result.reason}`);
          } else if (result.status === 'fulfilled' && !result.value.success && result.value.error) {
            errors.push(result.value.error);
          }
        }
      });
    }

    return {
      success: totalFailed === 0,
      totalProcessed,
      totalFailed,
      errors,
    };
  } catch (error) {
    console.error('Erro ao processar transações em lote:', error);
    return {
      success: false,
      totalProcessed: 0,
      totalFailed: 0,
      errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
    };
  }
}

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


    // 5. Estatísticas detalhadas
    const transactionCount = await prisma.transaction.count({
      where: dateFilter,
    });

    // Contar transações processadas (que têm ProcessedTransaction)
    let processedCount: number;
    if (dateFilter && year && month) {
      processedCount = await prisma.processedTransaction.count({
        where: {
          year: year,
          month: month,
        },
      });
    } else if (dateFilter && year) {
      processedCount = await prisma.processedTransaction.count({
        where: {
          year: year,
        },
      });
    } else {
      processedCount = await prisma.processedTransaction.count();
    }

    // Contar transações categorizadas (ProcessedTransaction com categoryId)
    let categorizedCount: number;
    if (dateFilter && year && month) {
      categorizedCount = await prisma.processedTransaction.count({
        where: {
          year: year,
          month: month,
          categoryId: { not: null },
        },
      });
    } else if (dateFilter && year) {
      categorizedCount = await prisma.processedTransaction.count({
        where: {
          year: year,
          categoryId: { not: null },
        },
      });
    } else {
      categorizedCount = await prisma.processedTransaction.count({
        where: {
          categoryId: { not: null },
        },
      });
    }

    const unprocessedCount = transactionCount - processedCount;
    const uncategorizedCount = processedCount - categorizedCount;

    const integrityStats: IntegrityStats = {
      transactionCount,
      processedCount,
      categorizedCount,
      unprocessedCount,
      uncategorizedCount,
    };

    // 6. Verificar transferências (usando category.type = "TRANSFER")
    let transferTransactions: Array<{ transaction: { amount: Decimal } | null; categoryId: string | null }>;
    
    if (dateFilter && year && month) {
      transferTransactions = await prisma.processedTransaction.findMany({
        where: {
          year: year,
          month: month,
          category: {
            type: 'TRANSFER',
          },
        },
        select: {
          transaction: {
            select: {
              amount: true,
            },
          },
          categoryId: true,
        },
      });
    } else if (dateFilter && year) {
      transferTransactions = await prisma.processedTransaction.findMany({
        where: {
          year: year,
          category: {
            type: 'TRANSFER',
          },
        },
        select: {
          transaction: {
            select: {
              amount: true,
            },
          },
          categoryId: true,
        },
      });
    } else {
      transferTransactions = await prisma.processedTransaction.findMany({
        where: {
          category: {
            type: 'TRANSFER',
          },
        },
        select: {
          transaction: {
            select: {
              amount: true,
            },
          },
          categoryId: true,
        },
      });
    }

    const categorizedTransfers = transferTransactions.filter((t) => t.categoryId !== null);
    const uncategorizedTransfers = transferTransactions.filter((t) => t.categoryId === null);
    
    // Valor líquido (deveria ser 0 se transferências estão balanceadas)
    const netTransferAmount = transferTransactions.reduce(
      (sum, t) => sum + Number(t.transaction?.amount || 0),
      0
    );
    
    // Volume total (valor absoluto - para fins informativos)
    const volumeTransferAmount = transferTransactions.reduce(
      (sum, t) => sum + Math.abs(Number(t.transaction?.amount || 0)),
      0
    );

    const transferStats: TransferStats = {
      totalTransfers: transferTransactions.length,
      categorizedTransfers: categorizedTransfers.length,
      uncategorizedTransfers: uncategorizedTransfers.length,
      netAmount: netTransferAmount,
      volumeAmount: volumeTransferAmount,
    };

    // Usar o uncategorizedCount já calculado
    const unifiedWithoutCategory = uncategorizedCount;

    // 8. Buscar transações não processadas (que não possuem ProcessedTransaction)
    const unprocessedTransactionsRaw = await prisma.transaction.findMany({
      where: {
        ...dateFilter,
        processedTransaction: null, // Transações sem ProcessedTransaction
      },
      include: {
        bankAccount: {
          select: {
            name: true,
            bankName: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 100, // Limitar a 100 transações para performance
    });

    const unprocessedTransactions: UnprocessedTransaction[] = unprocessedTransactionsRaw.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: Number(t.amount),
      bankAccountName: t.bankAccount.name,
      bankName: t.bankAccount.bankName,
    }));

    // 9. Comparação de saldos por conta (raw vs processadas)
    const accountBalanceComparisons: AccountBalanceComparison[] = [];
    
    for (const accountSum of transactionsByAccount) {
      const account = accountMap.get(accountSum.bankAccountId);
      if (!account) continue;

      const rawBalance = Number(accountSum._sum.amount || 0);

      // Calcular saldo das transações processadas para esta conta
      let processedBalance = 0;
      
      if (dateFilter && year && month) {
        // Note: Aggregate não funciona com relações. Usamos findMany e reduce.
        
        // Buscar transações processadas desta conta no período
        const processedTransactions = await prisma.processedTransaction.findMany({
          where: {
            year: year,
            month: month,
            transaction: {
              bankAccountId: accountSum.bankAccountId,
            },
          },
          include: {
            transaction: {
              select: {
                amount: true,
              },
            },
          },
        });
        
        processedBalance = processedTransactions.reduce(
          (sum, ut) => sum + Number(ut.transaction?.amount || 0),
          0
        );
      } else if (dateFilter && year) {
        const processedTransactions = await prisma.processedTransaction.findMany({
          where: {
            year: year,
            transaction: {
              bankAccountId: accountSum.bankAccountId,
            },
          },
          include: {
            transaction: {
              select: {
                amount: true,
              },
            },
          },
        });
        
        processedBalance = processedTransactions.reduce(
          (sum, ut) => sum + Number(ut.transaction?.amount || 0),
          0
        );
      } else {
        // Sem filtro de data - todas as transações processadas
        const processedTransactions = await prisma.processedTransaction.findMany({
          where: {
            transaction: {
              bankAccountId: accountSum.bankAccountId,
            },
          },
          include: {
            transaction: {
              select: {
                amount: true,
              },
            },
          },
        });
        
        processedBalance = processedTransactions.reduce(
          (sum, ut) => sum + Number(ut.transaction?.amount || 0),
          0
        );
      }

      const difference = rawBalance - processedBalance;
      const processedPercentage = rawBalance !== 0 ? (processedBalance / rawBalance) * 100 : 0;

      accountBalanceComparisons.push({
        bankAccountId: accountSum.bankAccountId,
        accountName: account.name,
        bankName: account.bankName,
        rawTransactionsBalance: rawBalance,
        processedTransactionsBalance: processedBalance,
        difference: Math.abs(difference),
        processedPercentage,
      });
    }

    // 10. Análise por período (para compatibilidade, retornamos array vazio)
    const recentActivity: RecentActivity[] = [];

    return {
      transactionsByAccount: processedTransactions,
      totalTransactions,
      integrityStats,
      transferStats,
      recentActivity,
      unifiedWithoutCategory,
      unprocessedTransactions,
      accountBalanceComparisons,
    };
  } catch (error) {
    console.error('Erro ao buscar dados de integridade:', error);
    throw error;
  }
}
