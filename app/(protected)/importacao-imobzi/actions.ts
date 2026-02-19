'use server';

import { prisma } from '@/lib/core/database/client';
import {
  getImobziTransactions,
  getImobziTransactionsSummary,
} from '@/lib/features/imobzi/api';
import { Decimal } from '@prisma/client/runtime/library';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/core/logger/logger';
import { matchIncomingToExisting } from '@/lib/features/transactions/duplicate-matcher';

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

    // Check for existing transactions in the date range (+ 1 day tolerance)
    const rangeStart = new Date(startDate);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(endDate);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
    });

    // Identify potential duplicates (fast in-memory match; criteria: date ±1 day and amount ±0.01)
    const incoming = transactions.map((imobziTx) => ({
      ...imobziTx,
      date: new Date(imobziTx.date),
      amount: Math.abs(imobziTx.value),
      transactionId: null as string | null,
    }));

    const matches = matchIncomingToExisting({
      incoming,
      existing: existingTransactions,
      options: {
        dateToleranceDays: 1,
        amountTolerance: 0.01,
      },
    });

    const hasMatchByIncoming = new Set<number>();
    for (const m of matches) {
      // For Imobzi, treat as duplicate when amount matches within tolerance
      if (m.matchCriteria.includes('exact_amount')) {
        hasMatchByIncoming.add((m.incoming as { amount: number }).amount);
      }
    }

    // Map duplicates by checking candidate matches per item (avoid relying on confidence/description)
    const transactionsWithDuplicateCheck = transactions.map((imobziTx) => {
      const txAmount = Math.abs(imobziTx.value);
      // NOTE: amount-only set is not sufficient if two incoming have same amount; use a stricter check below.
      const txDate = new Date(imobziTx.date);
      const isDuplicate = existingTransactions.some((existingTx) => {
        const dateDiff = Math.abs(txDate.getTime() - existingTx.date.getTime());
        const isDateClose = dateDiff <= 24 * 60 * 60 * 1000; // 1 day
        const isSameAmount =
          Math.abs(Math.abs(Number(existingTx.amount)) - txAmount) <= 0.01;
        return isDateClose && isSameAmount;
      });

      return { ...imobziTx, isDuplicate };
    });

    return {
      success: true,
      data: {
        summary: {
          ...summary,
          duplicates: transactionsWithDuplicateCheck.filter(
            (tx) => tx.isDuplicate
          ).length,
          new: transactionsWithDuplicateCheck.filter((tx) => !tx.isDuplicate)
            .length,
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
    logger.error('Error previewing Imobzi transactions', {
      event: 'imobzi_preview_error',
      bankAccountId,
      error,
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao buscar transações do Imobzi',
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
    const importedTransactions: Array<{ id: string; date: Date; description: string; amount: number }> = [];
    const skippedTransactions = [];
    const failedTransactions = [];

    // Prefetch existing transactions once (date ± 1 day)
    const rangeStart = new Date(startDate);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(endDate);
    rangeEnd.setDate(rangeEnd.getDate() + 1);

    const existingTransactions = await prisma.transaction.findMany({
      where: {
        bankAccountId,
        date: { gte: rangeStart, lte: rangeEnd },
      },
    });

    // Deduplicate within the import selection itself (by date+abs(amount) cents)
    const seenKeys = new Set<string>();
    const toCreate: Array<{
      date: Date;
      description: string;
      amount: Decimal;
      ofxTransId: string;
      ofxAccountId: string;
    }> = [];

    for (const transaction of transactionsToImport) {
      const txDate = new Date(transaction.date);
      const absAmount = Math.abs(transaction.value);
      const absCents = Math.round(absAmount * 100);
      const importKey = `${txDate.toISOString().slice(0, 10)}:${absCents}`;

      if (seenKeys.has(importKey)) {
        duplicates++;
        skippedTransactions.push({
          date: transaction.date,
          description: transaction.description,
          amount: transaction.value,
          reason: 'Transação duplicada na seleção',
        });
        continue;
      }
      seenKeys.add(importKey);

      // Duplicate check against DB (same as preview: date ±1 day and amount ±0.01)
      const isDuplicate = existingTransactions.some((existingTx) => {
        const dateDiff = Math.abs(txDate.getTime() - existingTx.date.getTime());
        const isDateClose = dateDiff <= 24 * 60 * 60 * 1000;
        const isSameAmount =
          Math.abs(Math.abs(Number(existingTx.amount)) - absAmount) <= 0.01;
        return isDateClose && isSameAmount;
      });

      if (isDuplicate) {
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
      let signedAmount = absAmount;
      const type = transaction.type.toLowerCase();
      if (
        type.includes('expense') ||
        type.includes('despesa') ||
        type.includes('transfer')
      ) {
        signedAmount = -absAmount;
      }

      // Keep OFX fields for traceability (not used for uniqueness)
      const ofxTransId = `imobzi_${txDate.getTime()}_${absCents}`;
      toCreate.push({
        date: txDate,
        description: transaction.description,
        amount: new Decimal(signedAmount),
        ofxTransId,
        ofxAccountId: 'IMOBZI',
      });
    }

    if (toCreate.length > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.createMany({
            data: toCreate.map((t) => ({
              bankAccountId,
              importBatchId: importBatch.id,
              date: t.date,
              description: t.description,
              amount: t.amount,
              ofxTransId: t.ofxTransId,
              ofxAccountId: t.ofxAccountId,
            })),
            // Will use @@unique([bankAccountId, date, amount, balance]) to skip true duplicates
            skipDuplicates: true,
          });

          const created = await tx.transaction.findMany({
            where: { importBatchId: importBatch.id },
            select: { id: true, date: true, description: true, amount: true },
          });

          await tx.processedTransaction.createMany({
            data: created.map((t) => ({
              transactionId: t.id,
              year: t.date.getFullYear(),
              month: t.date.getMonth() + 1,
            })),
            skipDuplicates: true, // transactionId is unique
          });

          imported = created.length;
          for (const t of created) {
            importedTransactions.push({
              id: t.id,
              date: t.date,
              description: t.description,
              amount: Number(t.amount),
            });
          }
        });
      } catch (error) {
        logger.error('Error importing Imobzi batch', {
          event: 'imobzi_import_batch_error',
          bankAccountId,
          importBatchId: importBatch.id,
          error,
        });
        errors += toCreate.length;
        for (const t of toCreate) {
          failedTransactions.push({
            transaction: {
              date: t.date.toISOString(),
              description: t.description,
              amount: Number(t.amount),
            },
            error: {
              message:
                error instanceof Error ? error.message : 'Erro desconhecido',
            },
          });
        }
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
    logger.error('Error importing Imobzi transactions', {
      event: 'imobzi_import_error',
      bankAccountId,
      error,
    });
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro ao importar transações do Imobzi',
    };
  }
}
