import { prisma } from '@/lib/database/client';
import { OFXParserService } from './parser';
import { DuplicateDetectionService } from './duplicate-detection';
import { ImportPreviewService } from './import-preview';
import { logger } from '@/lib/logger';
import type {
  OFXTransaction,
  OFXParseResult,
  DuplicateDetectionResult,
  ImportValidationError,
} from './types';
import type { PrismaClient } from '@/app/generated/prisma';
import type {
  ImportPreview,
  TransactionPreview,
  ImportSummary,
  TransactionAction,
} from './import-preview';
import type {
  BankAccount,
  Transaction,
  ImportBatch,
  Category,
  Property,
  ProcessedTransaction,
} from '@/app/generated/prisma';

/**
 * Core import service that orchestrates the complete OFX import process
 * Handles transaction-based execution with rollback capability
 */
export class ImportService {
  private parser: OFXParserService;
  private duplicateDetection: DuplicateDetectionService;
  private previewService: ImportPreviewService;

  constructor(
    parser?: OFXParserService,
    duplicateDetection?: DuplicateDetectionService,
    previewService?: ImportPreviewService
  ) {
    this.parser = parser || new OFXParserService();
    this.duplicateDetection =
      duplicateDetection || new DuplicateDetectionService();
    this.previewService =
      previewService ||
      new ImportPreviewService(this.parser, this.duplicateDetection);
  }

  /**
   * Process complete import from OFX file to database
   */
  async processImport(
    file: File,
    bankAccountId: string,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    let importBatch: ImportBatch | null = null;

    try {
      // Step 1: Generate preview
      const preview = await this.previewService.generatePreview(
        file,
        bankAccountId
      );

      if (!preview.success) {
        return {
          success: false,
          importBatchId: null,
          summary: preview.summary,
          errors: preview.validationErrors,
          transactions: {
            imported: [],
            skipped: [],
            failed: [],
          },
        };
      }

      // Step 2: Create import batch
      importBatch = await this.createImportBatch(
        file,
        bankAccountId,
        preview.parseResult
      );

      // Step 3: Execute import with transaction rollback capability
      const result = await this.executeImportWithTransaction(
        preview,
        importBatch,
        { ...options, bankAccountId }
      );

      // Step 4: Update import batch status
      await this.updateImportBatchStatus(
        importBatch.id,
        result.success ? 'COMPLETED' : 'FAILED',
        result.success ? null : this.formatErrorsForBatch(result.errors)
      );

      return {
        ...result,
        importBatchId: importBatch.id,
      };
    } catch (error) {
      // Update import batch status on error
      if (importBatch) {
        await this.updateImportBatchStatus(
          importBatch.id,
          'FAILED',
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }
      logger.error('ImportService.processImport failed', {
        event: 'import_service_process_error',
        error,
      });

      return {
        success: false,
        importBatchId: importBatch?.id || null,
        summary: {
          totalTransactions: 0,
          validTransactions: 0,
          invalidTransactions: 1,
          duplicateTransactions: 0,
          uniqueTransactions: 0,
          categorizedTransactions: 0,
          uncategorizedTransactions: 0,
        },
        errors: [
          {
            type: 'SYSTEM',
            code: 'IMPORT_EXECUTION_ERROR',
            message: `Import execution failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            recoverable: false,
          },
        ],
        transactions: {
          imported: [],
          skipped: [],
          failed: [],
        },
      };
    }
  }

  /**
   * Generate import preview without executing
   */
  async previewImport(
    file: File,
    bankAccountId: string
  ): Promise<ImportPreview> {
    return this.previewService.generatePreview(file, bankAccountId);
  }

  /**
   * Execute import from existing preview
   */
  async executeImport(
    preview: ImportPreview,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    if (!preview.success || !preview.bankAccount) {
      return {
        success: false,
        importBatchId: null,
        summary: preview.summary,
        errors: preview.validationErrors,
        transactions: {
          imported: [],
          skipped: [],
          failed: [],
        },
      };
    }

    let importBatch: ImportBatch | null = null;

    try {
      // Create import batch
      importBatch = await this.createImportBatchFromPreview(
        preview,
        preview.bankAccount.id
      );

      // Execute import with transaction rollback capability
      const result = await this.executeImportWithTransaction(
        preview,
        importBatch,
        { ...options, bankAccountId: preview.bankAccount.id }
      );

      // Update import batch status
      await this.updateImportBatchStatus(
        importBatch.id,
        result.success ? 'COMPLETED' : 'FAILED',
        result.success ? null : this.formatErrorsForBatch(result.errors)
      );

      return {
        ...result,
        importBatchId: importBatch.id,
      };
    } catch (error) {
      // Update import batch status on error
      if (importBatch) {
        await this.updateImportBatchStatus(
          importBatch.id,
          'FAILED',
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }

      throw error;
    }
  }

  /**
   * Create import batch record
   */
  private async createImportBatch(
    file: File,
    bankAccountId: string,
    parseResult: OFXParseResult
  ): Promise<ImportBatch> {
    // Calculate date range from transactions
    const dates = parseResult.transactions.map((t) => t.date);
    const startDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : new Date();
    const endDate =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : new Date();

    return prisma.importBatch.create({
      data: {
        fileName: file.name,
        fileSize: file.size,
        bankAccountId,
        startDate,
        endDate,
        transactionCount: parseResult.transactions.length,
        status: 'PROCESSING',
        fileType: 'OFX',
        ofxVersion: parseResult.version,
        ofxBankId: parseResult.accounts[0]?.bankId || null,
      },
    });
  }

  /**
   * Create import batch from preview
   */
  private async createImportBatchFromPreview(
    preview: ImportPreview,
    bankAccountId: string
  ): Promise<ImportBatch> {
    // Calculate date range from transactions
    const dates = preview.transactions.map((t) => t.transaction.date);
    const startDate =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : new Date();
    const endDate =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : new Date();

    return prisma.importBatch.create({
      data: {
        fileName: 'preview-import',
        fileSize: 0,
        bankAccountId,
        startDate,
        endDate,
        transactionCount: preview.transactions.length,
        status: 'PROCESSING',
        fileType: 'OFX',
        ofxVersion: preview.parseResult.version,
        ofxBankId: preview.parseResult.accounts[0]?.bankId || null,
      },
    });
  }

  /**
   * Execute import within a database transaction with rollback capability
   */
  private async executeImportWithTransaction(
    preview: ImportPreview,
    importBatch: ImportBatch,
    options: ImportOptions
  ): Promise<Omit<ImportResult, 'importBatchId'>> {
    return prisma.$transaction(
      async (tx) => {
        const importedTransactions: Transaction[] = [];
        const skippedTransactions: TransactionPreview[] = [];
        const failedTransactions: FailedTransaction[] = [];
        const errors: ImportValidationError[] = [];

        // Process all transactions and determine their fate
        for (const transactionPreview of preview.transactions) {
          // Check if transaction should be filtered out
          if (!this.shouldProcessTransaction(transactionPreview, options)) {
            skippedTransactions.push(transactionPreview);
            continue;
          }
          try {
            const action = this.determineTransactionAction(
              transactionPreview,
              options
            );

            if (action === 'skip') {
              skippedTransactions.push(transactionPreview);
              continue;
            }

            // Import all transactions except those explicitly marked to skip
            // Review transactions are now imported by default (categorization is optional)

            // Import the transaction
            const importedTransaction = await this.importSingleTransaction(
              tx,
              transactionPreview,
              importBatch.id,
              options
            );

            importedTransactions.push(importedTransaction);
          } catch (error) {
            const failedTransaction: FailedTransaction = {
              transaction: transactionPreview.transaction,
              error: {
                type: 'SYSTEM',
                code: 'TRANSACTION_IMPORT_ERROR',
                message: `Failed to import transaction: ${
                  error instanceof Error ? error.message : 'Unknown error'
                }`,
                recoverable: false,
              },
            };
            logger.error('ImportService.executeImport transaction failed', {
              event: 'import_service_tx_error',
              ofxTransId: transactionPreview.transaction.transactionId,
              bankAccountId: options.bankAccountId,
              error,
            });

            failedTransactions.push(failedTransaction);
            errors.push(failedTransaction.error);

            // If we're in strict mode, fail the entire import
            if (options.strictMode) {
              throw new Error(
                `Import failed in strict mode: ${failedTransaction.error.message}`
              );
            }
          }
        }

        // Generate final summary
        const summary = this.generateImportSummary(
          preview.transactions,
          importedTransactions,
          skippedTransactions,
          failedTransactions
        );

        return {
          success: failedTransactions.length === 0 || !options.strictMode,
          summary,
          errors,
          transactions: {
            imported: importedTransactions,
            skipped: skippedTransactions,
            failed: failedTransactions,
          },
        };
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );
  }

  /**
   * Import a single transaction with unified transaction creation
   */
  private async importSingleTransaction(
    tx: Omit<PrismaClient, '$disconnect' | '$connect'>, // Prisma transaction client
    transactionPreview: TransactionPreview,
    importBatchId: string,
    options: ImportOptions
  ): Promise<Transaction> {
    const { transaction, categorization } = transactionPreview;

    // Get bank account ID from options or from the preview
    const bankAccountId =
      options.bankAccountId ||
      (
        await prisma.importBatch.findUnique({
          where: { id: importBatchId },
          select: { bankAccountId: true },
        })
      )?.bankAccountId;

    if (!bankAccountId) {
      throw new Error('Bank account ID is required for transaction import');
    }

    // Create the raw transaction
    const importedTransaction = await tx.transaction.create({
      data: {
        bankAccountId,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        ofxTransId: transaction.transactionId,
        ofxAccountId: transaction.accountId,
        importBatchId,
        isDuplicate: transactionPreview.isDuplicate,
      },
    });

    // Create processed transaction (with or without categorization)
    if (options.createProcessedTransactions !== false) {
      try {
        await tx.processedTransaction.create({
          data: {
            transactionId: importedTransaction.id,
            year: transaction.date.getFullYear(),
            month: transaction.date.getMonth() + 1,
            categoryId: categorization.suggestedCategory?.id || null,
            propertyId: categorization.suggestedProperty?.id || null,
            details: categorization.reason,
            isReviewed: categorization.confidence >= 0.8 && categorization.suggestedCategory !== null,
          },
        });
      } catch (error) {
        logger.error(
          'ImportService.importSingleTransaction processed creation failed',
          {
            event: 'import_service_processed_create_error',
            transactionId: importedTransaction.id,
            error,
          }
        );
        throw error;
      }
    }

    return importedTransaction;
  }

  /**
   * Check if a transaction should be processed for import
   */
  private shouldProcessTransaction(
    transaction: TransactionPreview,
    options: ImportOptions
  ): boolean {
    // Skip invalid transactions unless explicitly allowed
    if (!transaction.isValid && !options.importInvalidTransactions) {
      return false;
    }

    // Skip duplicates unless explicitly allowed
    if (transaction.isDuplicate && !options.importDuplicates) {
      return false;
    }

    return true;
  }

  /**
   * Filter transactions for import based on options
   */
  private filterTransactionsForImport(
    transactions: TransactionPreview[],
    options: ImportOptions
  ): TransactionPreview[] {
    return transactions.filter((transaction) =>
      this.shouldProcessTransaction(transaction, options)
    );
  }

  /**
   * Determine action for a transaction based on preview and options
   */
  private determineTransactionAction(
    transactionPreview: TransactionPreview,
    options: ImportOptions
  ): TransactionAction {
    // Override with user-specified actions if provided
    if (options.transactionActions) {
      const userAction =
        options.transactionActions[
          transactionPreview.transaction.transactionId
        ];
      if (userAction) {
        return userAction;
      }
    }

    // Use recommended action from preview
    return transactionPreview.recommendedAction;
  }

  /**
   * Update import batch status
   */
  private async updateImportBatchStatus(
    importBatchId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    errorMessage?: string | null
  ): Promise<void> {
    await prisma.importBatch.update({
      where: { id: importBatchId },
      data: {
        status,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Format errors for import batch storage
   */
  private formatErrorsForBatch(errors: ImportValidationError[]): string {
    return errors.map((error) => `${error.code}: ${error.message}`).join('\n');
  }

  /**
   * Generate final import summary
   */
  private generateImportSummary(
    allTransactions: TransactionPreview[],
    imported: Transaction[],
    _skipped: TransactionPreview[],
    _failed: FailedTransaction[]
  ): ImportSummary {
    const categorizedCount = imported.length; // All imported transactions have some categorization attempt

    return {
      totalTransactions: allTransactions.length,
      validTransactions: allTransactions.filter((t) => t.isValid).length,
      invalidTransactions: allTransactions.filter((t) => !t.isValid).length,
      duplicateTransactions: allTransactions.filter((t) => t.isDuplicate)
        .length,
      uniqueTransactions: allTransactions.filter((t) => !t.isDuplicate).length,
      categorizedTransactions: categorizedCount,
      uncategorizedTransactions: allTransactions.length - categorizedCount,
    };
  }
}

// Type definitions for import service
export interface ImportOptions {
  bankAccountId?: string;
  importDuplicates?: boolean;
  importInvalidTransactions?: boolean;
  createProcessedTransactions?: boolean;
  strictMode?: boolean;
  transactionActions?: Record<string, TransactionAction>;
}

export interface ImportResult {
  success: boolean;
  importBatchId: string | null;
  summary: ImportSummary;
  errors: ImportValidationError[];
  transactions: {
    imported: Transaction[];
    skipped: TransactionPreview[];
    failed: FailedTransaction[];
  };
}

export interface FailedTransaction {
  transaction: OFXTransaction;
  error: ImportValidationError;
}
