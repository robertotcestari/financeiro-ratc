'use server';

import { getCurrentBalanceOptimized } from '@/lib/financial-calculations-optimized';
import { ImportService } from '@/lib/ofx/import-service';
import { OFXParserService } from '@/lib/ofx/parser';
import type { TransactionAction } from '@/lib/ofx/import-preview';
import { logger } from '@/lib/logger';

/**
 * Retorna saldos para o período do arquivo OFX a serem exibidos na prévia:
 * - beforeStart: saldo imediatamente antes do início do período (início - 1ms)
 * - beforeEnd: saldo no fim do período antes da importação (somente dados já no banco)
 */
export async function getPreviewBalances(
  bankAccountId: string,
  startISO: string,
  endISO: string
): Promise<{ beforeStart: number; beforeEnd: number }> {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);

  // Saldo imediatamente antes do início do período
  const startMinus = new Date(startDate.getTime() - 1);
  const startBalance = await getCurrentBalanceOptimized(
    bankAccountId,
    startMinus
  );

  // Saldo no fim do período (sem considerar transações do arquivo ainda não importadas)
  const endBalance = await getCurrentBalanceOptimized(bankAccountId, endDate);

  return {
    beforeStart: startBalance.balance,
    beforeEnd: endBalance.balance,
  };
}

/**
 * Execute the actual import of OFX transactions to the database
 */
export async function confirmImportTransactions(
  fileContent: string,
  bankAccountId: string,
  transactionActions: Record<string, TransactionAction>,
  transactionCategories?: Record<string, string | null>,
  transactionProperties?: Record<string, string | null>
): Promise<{
  success: boolean;
  importBatchId?: string | null;
  summary?: {
    totalTransactions: number;
    validTransactions: number;
    invalidTransactions: number;
    duplicateTransactions: number;
    uniqueTransactions: number;
    categorizedTransactions: number;
    uncategorizedTransactions: number;
  };
  imported?: Array<{
    id?: string;
    date: Date | string;
    description: string;
    amount: number;
  }>;
  skipped?: Array<{
    id?: string;
    date: Date | string;
    description: string;
    amount: number;
  }>;
  failed?: Array<{
    transaction: {
      id?: string;
      date: Date | string;
      description: string;
      amount: number;
    };
    error: { type?: string; code: string; message: string };
  }>;
  error?: string;
}> {
  try {
    logger.info('Starting OFX import', {
      event: 'ofx_import_start',
      bankAccountId,
      actionsCount: Object.keys(transactionActions).length,
    });

    // Parse the OFX file content
    const parser = new OFXParserService();
    const parseResult = await parser.parseOfxString(fileContent);
    
    if (!parseResult.success) {
      logger.error('Failed to parse OFX content', {
        event: 'ofx_parse_error',
        errors: parseResult.errors,
      });
      return {
        success: false,
        error: parseResult.errors?.join(', ') || 'Failed to parse OFX file',
      };
    }

    // Use ImportService to handle the actual import
    const importService = new ImportService();
    
    // Generate preview from parsed result (avoids File API issues on server)
    const preview = await importService.previewImportFromParsedResult(parseResult, bankAccountId);
    
    if (!preview.success) {
      logger.error('Failed to generate import preview', {
        event: 'ofx_preview_error',
        errors: preview.validationErrors,
      });
      return {
        success: false,
        error: 'Failed to generate import preview',
      };
    }

    // Don't modify the preview - pass user selections directly to executeImport
    // This ensures transactions start without categories unless explicitly selected

    // Execute the import with user actions and selected categories/properties
    const result = await importService.executeImport(preview, {
      bankAccountId,
      transactionActions,
      transactionCategories,
      transactionProperties,
      importDuplicates: false,
      createProcessedTransactions: true,
    });

    logger.info('OFX import completed', {
      event: 'ofx_import_complete',
      success: result.success,
      importBatchId: result.importBatchId,
      summary: result.summary,
    });

    // Map the result to the expected format
    return {
      success: result.success,
      importBatchId: result.importBatchId,
      summary: result.summary,
      imported: result.transactions.imported.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
      })),
      skipped: result.transactions.skipped.map((tp) => ({
        id: tp.transaction.transactionId,
        date: tp.transaction.date,
        description: tp.transaction.description,
        amount: tp.transaction.amount,
      })),
      failed: result.transactions.failed.map((f) => ({
        transaction: {
          id: f.transaction.transactionId,
          date: f.transaction.date,
          description: f.transaction.description,
          amount: f.transaction.amount,
        },
        error: f.error,
      })),
    };
  } catch (error) {
    logger.error('Unexpected error during OFX import', {
      event: 'ofx_import_error',
      error,
    });
    
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred during import',
    };
  }
}
