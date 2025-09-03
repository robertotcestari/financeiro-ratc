'use server';

import { prisma } from '@/lib/core/database/client';
import { getImobziTransactions, getImobziTransactionsSummary } from '@/lib/features/imobzi/api';
import { Decimal } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';

/**
 * Fetch and preview Imobzi transactions
 */
export async function previewImobziTransactions(
  startDate: string,
  endDate: string,
  bankAccountId: string
) {
  try {
    // Get the bank account to extract the Imobzi account ID if available
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return {
        success: false,
        error: 'Conta bancária não encontrada',
      };
    }

    // Fetch transactions from Imobzi
    const { summary, transactions } = await getImobziTransactionsSummary(
      startDate,
      endDate,
      undefined // TODO: Add externalId field to bankAccount if needed
    );

    // Check for existing transactions in the date range
    const existingTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: {
        description: true,
        amount: true,
        date: true,
      },
    });

    // Identify potential duplicates
    const transactionsWithDuplicateCheck = transactions.map((imobziTx) => {
      const txDate = new Date(imobziTx.date);
      const isDuplicate = existingTransactions.some((existingTx) => {
        const dateDiff = Math.abs(
          txDate.getTime() - existingTx.date.getTime()
        );
        const isDateClose = dateDiff < 24 * 60 * 60 * 1000; // Within 1 day
        const isSameAmount = 
          Math.abs(Number(existingTx.amount) - Math.abs(imobziTx.value)) < 0.01;
        
        return isDateClose && isSameAmount;
      });

      return {
        ...imobziTx,
        isDuplicate,
      };
    });

    return {
      success: true,
      data: {
        summary: {
          ...summary,
          duplicates: transactionsWithDuplicateCheck.filter(tx => tx.isDuplicate).length,
          new: transactionsWithDuplicateCheck.filter(tx => !tx.isDuplicate).length,
        },
        transactions: transactionsWithDuplicateCheck,
        bankAccount: {
          id: bankAccount.id,
          name: bankAccount.name,
          bankName: bankAccount.bankName,
        },
      },
    };
  } catch (error) {
    console.error('Error previewing Imobzi transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar transações do Imobzi',
    };
  }
}

/**
 * Import Imobzi transactions to database
 */
export async function importImobziTransactions(
  startDate: string,
  endDate: string,
  bankAccountId: string,
  selectedTransactionIds?: string[]
) {
  try {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return {
        success: false,
        error: 'Conta bancária não encontrada',
      };
    }

    // Fetch all transactions
    const transactions = await getImobziTransactions(
      startDate,
      endDate,
      undefined // TODO: Add externalId field to bankAccount if needed
    );

    // Filter selected transactions if provided
    const transactionsToImport = selectedTransactionIds
      ? transactions.filter((_, index) => 
          selectedTransactionIds.includes(index.toString())
        )
      : transactions;

    // Create import batch
    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: `imobzi_${startDate}_${endDate}`,
        fileSize: 0, // No actual file for Imobzi imports
        bankAccountId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        transactionCount: transactionsToImport.length,
        status: 'PROCESSING',
        fileType: 'IMOBZI',
      },
    });

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    const importedTransactions = [];
    const skippedTransactions = [];
    const failedTransactions = [];

    // Import transactions
    for (const transaction of transactionsToImport) {
      try {
        const txDate = new Date(transaction.date);
        
        // Check for duplicate
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            bankAccountId,
            date: {
              gte: new Date(txDate.getTime() - 24 * 60 * 60 * 1000),
              lte: new Date(txDate.getTime() + 24 * 60 * 60 * 1000),
            },
            amount: {
              gte: new Decimal(Math.abs(transaction.value) - 0.01),
              lte: new Decimal(Math.abs(transaction.value) + 0.01),
            },
          },
        });

        if (existingTransaction) {
          duplicates++;
          skippedTransactions.push({
            date: transaction.date,
            description: transaction.description,
            amount: transaction.value,
            reason: 'Transação duplicada',
          });
          continue;
        }

        // Determine transaction type and amount sign
        let amount = Math.abs(transaction.value);
        const type = transaction.type.toLowerCase();

        // Expenses and transfers should be negative (money out)
        if (
          type.includes('expense') ||
          type.includes('despesa') ||
          type.includes('transfer')
        ) {
          amount = -Math.abs(amount);
        }

        // Create the transaction
        const newTransaction = await prisma.transaction.create({
          data: {
            bankAccountId,
            importBatchId: importBatch.id,
            date: txDate,
            description: transaction.description,
            amount: new Decimal(amount),
            ofxTransId: `imobzi_${txDate.getTime()}_${Math.abs(amount)}`,
            ofxAccountId: 'IMOBZI', // Mark as Imobzi import
          },
        });

        imported++;
        importedTransactions.push({
          id: newTransaction.id,
          date: newTransaction.date,
          description: newTransaction.description,
          amount: Number(newTransaction.amount),
        });

        // Create processed transaction
        await prisma.processedTransaction.create({
          data: {
            transactionId: newTransaction.id,
            year: txDate.getFullYear(),
            month: txDate.getMonth() + 1, // JavaScript months are 0-indexed
            // Category will be auto-assigned by rules or manually later
          },
        });

      } catch (error) {
        console.error('Error importing transaction:', error);
        errors++;
        failedTransactions.push({
          transaction: {
            date: transaction.date,
            description: transaction.description,
            amount: transaction.value,
          },
          error: {
            message: error instanceof Error ? error.message : 'Erro desconhecido',
          },
        });
      }
    }

    // Update import batch status
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: 'COMPLETED',
        transactionCount: imported + duplicates + errors,
      },
    });

    // Revalidate the transactions page
    revalidatePath('/transacoes');

    return {
      success: true,
      summary: {
        totalTransactions: transactionsToImport.length,
        importedTransactions: imported,
        duplicateTransactions: duplicates,
        errorTransactions: errors,
      },
      imported: importedTransactions,
      skipped: skippedTransactions,
      failed: failedTransactions,
    };

  } catch (error) {
    console.error('Error importing Imobzi transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao importar transações do Imobzi',
    };
  }
}
