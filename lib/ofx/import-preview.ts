import { prisma } from '@/lib/database/client';
import { OFXParserService } from './parser';
import { DuplicateDetectionService } from './duplicate-detection';
import { logger } from '@/lib/logger';
import type {
  OFXTransaction,
  OFXParseResult,
  DuplicateDetectionResult,
  DuplicateMatch,
} from './types';
import type { Category, Property, BankAccount } from '@/app/generated/prisma';

/**
 * Import preview and validation service
 * Processes OFX data without saving to database
 */
export class ImportPreviewService {
  private parser: OFXParserService;
  private duplicateDetection: DuplicateDetectionService;

  constructor(
    parser?: OFXParserService,
    duplicateDetection?: DuplicateDetectionService
  ) {
    this.parser = parser || new OFXParserService();
    this.duplicateDetection =
      duplicateDetection || new DuplicateDetectionService();
  }

  /**
   * Generate import preview from parsed OFX result
   */
  async generatePreviewFromParsedResult(
    parseResult: OFXParseResult,
    bankAccountId: string
  ): Promise<ImportPreview> {
    try {
      // Validate bank account exists
      const bankAccount = await this.validateBankAccount(bankAccountId);

      if (!parseResult.success) {
        return {
          success: false,
          bankAccount,
          parseResult,
          transactions: [],
          duplicates: {
            duplicates: [],
            uniqueTransactions: [],
            summary: {
              total: 0,
              duplicates: 0,
              unique: 0,
              exactMatches: 0,
              potentialMatches: 0,
            },
          },
          validationErrors: parseResult.errors.map((error) => ({
            type: 'PARSING',
            code: error.code,
            message: error.message,
            transactionIndex: error.line,
            details: error.details,
            recoverable: false,
          })),
          summary: {
            totalTransactions: 0,
            validTransactions: 0,
            invalidTransactions: parseResult.errors.length,
            duplicateTransactions: 0,
            uniqueTransactions: 0,
            categorizedTransactions: 0,
            uncategorizedTransactions: 0,
          },
        };
      }

      // Detect duplicates
      const duplicateResult = await this.duplicateDetection.findDuplicates(
        parseResult.transactions,
        bankAccountId
      );

      // Validate transactions
      const validationResult = await this.validateTransactions(
        parseResult.transactions
      );

      // Generate transaction previews with categorization
      const transactionPreviews = await this.generateTransactionPreviews(
        parseResult.transactions,
        duplicateResult,
        validationResult.validTransactions
      );

      // Generate summary
      const summary = this.generateSummary(
        parseResult.transactions,
        duplicateResult,
        validationResult,
        transactionPreviews
      );

      return {
        success: true,
        bankAccount,
        parseResult,
        transactions: transactionPreviews,
        duplicates: duplicateResult,
        validationErrors: validationResult.errors,
        summary,
      };
    } catch (error) {
      logger.error('ImportPreviewService.generatePreviewFromParsedResult failed', {
        event: 'import_preview_error',
        bankAccountId,
        error,
      });
      const bankAccount = await this.getBankAccountSafely(bankAccountId);

      return {
        success: false,
        bankAccount,
        parseResult,
        transactions: [],
        duplicates: {
          duplicates: [],
          uniqueTransactions: [],
          summary: {
            total: 0,
            duplicates: 0,
            unique: 0,
            exactMatches: 0,
            potentialMatches: 0,
          },
        },
        validationErrors: [
          {
            type: 'SYSTEM',
            code: 'PREVIEW_GENERATION_ERROR',
            message: `Failed to generate preview: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            recoverable: false,
          },
        ],
        summary: {
          totalTransactions: 0,
          validTransactions: 0,
          invalidTransactions: 1,
          duplicateTransactions: 0,
          uniqueTransactions: 0,
          categorizedTransactions: 0,
          uncategorizedTransactions: 0,
        },
      };
    }
  }

  /**
   * Generate import preview from OFX file
   */
  async generatePreview(
    file: File,
    bankAccountId: string
  ): Promise<ImportPreview> {
    try {
      // Validate bank account exists
      const bankAccount = await this.validateBankAccount(bankAccountId);

      // Parse OFX file
      const parseResult = await this.parser.parseFile(file);

      if (!parseResult.success) {
        return {
          success: false,
          bankAccount,
          parseResult,
          transactions: [],
          duplicates: {
            duplicates: [],
            uniqueTransactions: [],
            summary: {
              total: 0,
              duplicates: 0,
              unique: 0,
              exactMatches: 0,
              potentialMatches: 0,
            },
          },
          validationErrors: parseResult.errors.map((error) => ({
            type: 'PARSING',
            code: error.code,
            message: error.message,
            transactionIndex: error.line,
            details: error.details,
            recoverable: false,
          })),
          summary: {
            totalTransactions: 0,
            validTransactions: 0,
            invalidTransactions: parseResult.errors.length,
            duplicateTransactions: 0,
            uniqueTransactions: 0,
            categorizedTransactions: 0,
            uncategorizedTransactions: 0,
          },
        };
      }

      // Detect duplicates
      const duplicateResult = await this.duplicateDetection.findDuplicates(
        parseResult.transactions,
        bankAccountId
      );

      // Validate transactions
      const validationResult = await this.validateTransactions(
        parseResult.transactions
      );

      // Generate transaction previews with categorization
      const transactionPreviews = await this.generateTransactionPreviews(
        parseResult.transactions,
        duplicateResult,
        validationResult.validTransactions
      );

      // Generate summary
      const summary = this.generateSummary(
        parseResult.transactions,
        duplicateResult,
        validationResult,
        transactionPreviews
      );

      return {
        success: true,
        bankAccount,
        parseResult,
        transactions: transactionPreviews,
        duplicates: duplicateResult,
        validationErrors: validationResult.errors,
        summary,
      };
    } catch (error) {
      logger.error('ImportPreviewService.generatePreview failed', {
        event: 'import_preview_error',
        bankAccountId,
        error,
      });
      const bankAccount = await this.getBankAccountSafely(bankAccountId);

      return {
        success: false,
        bankAccount,
        parseResult: {
          success: false,
          version: '1.x',
          format: 'SGML',
          accounts: [],
          transactions: [],
          errors: [],
        },
        transactions: [],
        duplicates: {
          duplicates: [],
          uniqueTransactions: [],
          summary: {
            total: 0,
            duplicates: 0,
            unique: 0,
            exactMatches: 0,
            potentialMatches: 0,
          },
        },
        validationErrors: [
          {
            type: 'SYSTEM',
            code: 'PREVIEW_GENERATION_ERROR',
            message: `Failed to generate preview: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            recoverable: false,
          },
        ],
        summary: {
          totalTransactions: 0,
          validTransactions: 0,
          invalidTransactions: 1,
          duplicateTransactions: 0,
          uniqueTransactions: 0,
          categorizedTransactions: 0,
          uncategorizedTransactions: 0,
        },
      };
    }
  }

  /**
   * Validate bank account exists and is accessible
   */
  private async validateBankAccount(
    bankAccountId: string
  ): Promise<BankAccount> {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new Error(`Bank account with ID ${bankAccountId} not found`);
    }

    if (!bankAccount.isActive) {
      throw new Error(`Bank account ${bankAccount.name} is not active`);
    }

    return bankAccount;
  }

  /**
   * Safely get bank account (returns null if not found)
   */
  private async getBankAccountSafely(
    bankAccountId: string
  ): Promise<BankAccount | null> {
    try {
      return await prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
      });
    } catch {
      return null;
    }
  }

  /**
   * Validate individual transactions
   */
  private async validateTransactions(
    transactions: OFXTransaction[]
  ): Promise<TransactionValidationResult> {
    const validTransactions: OFXTransaction[] = [];
    const errors: ImportValidationError[] = [];

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const transactionErrors = this.validateSingleTransaction(transaction, i);

      if (transactionErrors.length === 0) {
        validTransactions.push(transaction);
      } else {
        errors.push(...transactionErrors);
      }
    }

    return {
      validTransactions,
      invalidTransactions: transactions.length - validTransactions.length,
      errors,
    };
  }

  /**
   * Validate a single transaction
   */
  private validateSingleTransaction(
    transaction: OFXTransaction,
    index: number
  ): ImportValidationError[] {
    const errors: ImportValidationError[] = [];

    // Required fields validation
    if (!transaction.transactionId || transaction.transactionId.trim() === '') {
      errors.push({
        type: 'VALIDATION',
        code: 'MISSING_TRANSACTION_ID',
        message: 'Transaction ID is required',
        transactionIndex: index,
        recoverable: false,
      });
    }

    if (!transaction.date) {
      errors.push({
        type: 'VALIDATION',
        code: 'MISSING_DATE',
        message: 'Transaction date is required',
        transactionIndex: index,
        recoverable: false,
      });
    }

    if (transaction.amount === undefined || transaction.amount === null) {
      errors.push({
        type: 'VALIDATION',
        code: 'MISSING_AMOUNT',
        message: 'Transaction amount is required',
        transactionIndex: index,
        recoverable: false,
      });
    }

    // Data type validation
    if (transaction.date && isNaN(transaction.date.getTime())) {
      errors.push({
        type: 'VALIDATION',
        code: 'INVALID_DATE',
        message: 'Transaction date is invalid',
        transactionIndex: index,
        recoverable: false,
      });
    }

    if (typeof transaction.amount === 'number' && isNaN(transaction.amount)) {
      errors.push({
        type: 'VALIDATION',
        code: 'INVALID_AMOUNT',
        message: 'Transaction amount is not a valid number',
        transactionIndex: index,
        recoverable: false,
      });
    }

    // Business logic validation
    if (transaction.date && transaction.date > new Date()) {
      errors.push({
        type: 'VALIDATION',
        code: 'FUTURE_DATE',
        message: 'Transaction date cannot be in the future',
        transactionIndex: index,
        recoverable: true,
      });
    }

    if (
      typeof transaction.amount === 'number' &&
      Math.abs(transaction.amount) > 1000000
    ) {
      errors.push({
        type: 'VALIDATION',
        code: 'AMOUNT_TOO_LARGE',
        message: 'Transaction amount exceeds maximum allowed value',
        transactionIndex: index,
        recoverable: true,
      });
    }

    // Description validation
    if (!transaction.description || transaction.description.trim() === '') {
      errors.push({
        type: 'VALIDATION',
        code: 'MISSING_DESCRIPTION',
        message: 'Transaction description is missing',
        transactionIndex: index,
        recoverable: true,
      });
    }

    return errors;
  }

  /**
   * Generate transaction previews with categorization
   */
  private async generateTransactionPreviews(
    transactions: OFXTransaction[],
    duplicateResult: DuplicateDetectionResult,
    validTransactions: OFXTransaction[]
  ): Promise<TransactionPreview[]> {
    const previews: TransactionPreview[] = [];

    // Get all categories for categorization
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    // Get all properties for property assignment
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    for (const transaction of transactions) {
      const isValid = validTransactions.includes(transaction);
      const duplicateMatches = duplicateResult.duplicates.filter(
        (dup) => dup.ofxTransaction.transactionId === transaction.transactionId
      );

      // Attempt automatic categorization
      const categorization = await this.attemptAutomaticCategorization(
        transaction,
        categories,
        properties
      );

      const preview: TransactionPreview = {
        transaction,
        isValid,
        isDuplicate: duplicateMatches.length > 0,
        duplicateMatches,
        categorization,
        recommendedAction: this.determineRecommendedAction(
          isValid,
          duplicateMatches,
          categorization
        ),
      };

      previews.push(preview);
    }

    return previews;
  }

  /**
   * Attempt automatic categorization for a transaction
   */
  private async attemptAutomaticCategorization(
    transaction: OFXTransaction,
    categories: Category[],
    properties: Property[]
  ): Promise<TransactionCategorization> {
    // Enhanced rule-based categorization:
    // - Use description + memo keywords (pt-BR and en)
    // - Map OFX transaction type to category with confidence boosts
    // - Fallback by amount sign
    // - Property assignment by code/address keywords

    const baseText = `${transaction.description} ${
      transaction.memo ?? ''
    }`.toLowerCase();
    const amount = transaction.amount;
    const typeStr = (transaction.type ?? '').toString().toUpperCase();

    // Default to uncategorized
    let suggestedCategory: Category | null = null;
    let suggestedProperty: Property | null = null;
    let confidence = 0;
    let reason = 'No matching categorization rules found';

    const findByType = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER') =>
      categories.find((cat) => cat.type === type) || null;

    // 1) OFX type → category hints (raise confidence if consistent with sign)
    if (typeStr.includes('TRANSFER') || typeStr.includes('XFER')) {
      const cat = findByType('TRANSFER');
      if (cat) {
        suggestedCategory = cat;
        confidence = Math.max(confidence, 0.85);
        reason = `OFX type indicates transfer: ${typeStr}`;
      }
    } else if (
      amount > 0 &&
      (typeStr.includes('CREDIT') ||
        typeStr.includes('DEP') ||
        typeStr.includes('DEPOSIT') ||
        typeStr.includes('CR') ||
        typeStr.includes('PAYMENT RECEIVED'))
    ) {
      const cat = findByType('INCOME');
      if (cat) {
        suggestedCategory = cat;
        confidence = Math.max(confidence, 0.75);
        reason = `OFX type indicates income: ${typeStr}`;
      }
    } else if (
      amount < 0 &&
      (typeStr.includes('DEBIT') ||
        typeStr.includes('DBT') ||
        typeStr.includes('POS') ||
        typeStr.includes('ATM') ||
        typeStr.includes('WITHDRAWAL') ||
        typeStr.includes('FEE'))
    ) {
      const cat = findByType('EXPENSE');
      if (cat) {
        suggestedCategory = cat;
        confidence = Math.max(confidence, 0.7);
        reason = `OFX type indicates expense: ${typeStr}`;
      }
    }

    // 2) Keyword rules (pt-BR + en), using description + memo
    if (amount > 0) {
      const incomeKeywords = [
        // pt-BR
        'deposito',
        'crédito',
        'credito',
        'salario',
        'receita',
        'pagamento',
        // en
        'deposit',
        'credit',
        'salary',
        'income',
        'payment',
      ];
      const matchedKeyword = incomeKeywords.find((kw) => baseText.includes(kw));
      if (matchedKeyword) {
        const cat = findByType('INCOME');
        if (cat) {
          suggestedCategory = suggestedCategory ?? cat;
          // Boost if type mapping already aligned
          confidence = Math.max(
            confidence,
            suggestedCategory === cat ? 0.85 : 0.7
          );
          reason += ` | Income keyword: ${matchedKeyword}`;
        }
      }
    }

    if (amount < 0) {
      const expenseKeywords = [
        // pt-BR
        'debito',
        'débito',
        'saque',
        'pagamento',
        'compra',
        'taxa',
        // en
        'debit',
        'withdrawal',
        'purchase',
        'fee',
        'charge',
        'payment',
      ];
      const matchedKeyword = expenseKeywords.find((kw) =>
        baseText.includes(kw)
      );
      if (matchedKeyword) {
        const cat = findByType('EXPENSE');
        if (cat) {
          suggestedCategory = suggestedCategory ?? cat;
          confidence = Math.max(
            confidence,
            suggestedCategory === cat ? 0.8 : 0.6
          );
          reason += ` | Expense keyword: ${matchedKeyword}`;
        }
      }
    }

    const transferKeywords = [
      'transferencia',
      'ted',
      'doc',
      'pix',
      'transfer',
      'wire',
      'bank transfer',
    ];
    const transferKeyword = transferKeywords.find((kw) =>
      baseText.includes(kw)
    );
    if (transferKeyword) {
      const cat = findByType('TRANSFER');
      if (cat) {
        suggestedCategory = suggestedCategory ?? cat;
        confidence = Math.max(
          confidence,
          suggestedCategory === cat ? 0.9 : 0.8
        );
        reason += ` | Transfer keyword: ${transferKeyword}`;
      }
    }

    // 3) Fallback by amount sign if still uncategorized and categories exist
    if (!suggestedCategory) {
      if (amount > 0) {
        const incomeCat = findByType('INCOME');
        if (incomeCat) {
          suggestedCategory = incomeCat;
          confidence = Math.max(confidence, 0.55);
          reason += ' | Fallback by amount sign: INCOME';
        }
      } else if (amount < 0) {
        const expenseCat = findByType('EXPENSE');
        if (expenseCat) {
          suggestedCategory = expenseCat;
          confidence = Math.max(confidence, 0.55);
          reason += ' | Fallback by amount sign: EXPENSE';
        }
      }
    }

    // 4) Property assignment based on description + memo
    for (const property of properties) {
      const propertyKeywords = [
        property.code.toLowerCase(),
        property.address.toLowerCase(),
      ];
      const matchedPropertyKeyword = propertyKeywords.find((kw) =>
        baseText.includes(kw)
      );
      if (matchedPropertyKeyword) {
        suggestedProperty = property;
        confidence = Math.max(confidence, 0.6);
        reason += ` | Property matched: ${property.code}`;
        break;
      }
    }

    return {
      suggestedCategory,
      suggestedProperty,
      confidence,
      reason,
      isAutomaticallyCategorized: suggestedCategory !== null,
    };
  }

  /**
   * Determine recommended action for a transaction
   */
  private determineRecommendedAction(
    isValid: boolean,
    duplicateMatches: DuplicateMatch[],
    _categorization: TransactionCategorization
  ): TransactionAction {
    if (!isValid) {
      return 'review';
    }

    if (duplicateMatches.length > 0) {
      const hasExactMatch = duplicateMatches.some(
        (match) => match.isExactMatch
      );
      return hasExactMatch ? 'skip' : 'review';
    }

    // Always recommend import unless it's a duplicate or invalid
    // Categorization is optional now
    return 'import';
  }

  /**
   * Generate import summary
   */
  private generateSummary(
    allTransactions: OFXTransaction[],
    duplicateResult: DuplicateDetectionResult,
    validationResult: TransactionValidationResult,
    transactionPreviews: TransactionPreview[]
  ): ImportSummary {
    const categorizedCount = transactionPreviews.filter(
      (preview) => preview.categorization.isAutomaticallyCategorized
    ).length;

    return {
      totalTransactions: allTransactions.length,
      validTransactions: validationResult.validTransactions.length,
      invalidTransactions: validationResult.invalidTransactions,
      duplicateTransactions: duplicateResult.summary.duplicates,
      uniqueTransactions: duplicateResult.summary.unique,
      categorizedTransactions: categorizedCount,
      uncategorizedTransactions: allTransactions.length - categorizedCount,
    };
  }
}

// Type definitions for import preview
export interface ImportPreview {
  success: boolean;
  bankAccount: BankAccount | null;
  parseResult: OFXParseResult;
  transactions: TransactionPreview[];
  duplicates: DuplicateDetectionResult;
  validationErrors: ImportValidationError[];
  summary: ImportSummary;
}

export interface TransactionPreview {
  transaction: OFXTransaction;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateMatches: DuplicateMatch[];
  categorization: TransactionCategorization;
  recommendedAction: TransactionAction;
}

export interface TransactionCategorization {
  suggestedCategory: Category | null;
  suggestedProperty: Property | null;
  confidence: number;
  reason: string;
  isAutomaticallyCategorized: boolean;
}

export interface ImportValidationError {
  type: 'PARSING' | 'VALIDATION' | 'SYSTEM';
  code: string;
  message: string;
  transactionIndex?: number;
  details?: unknown;
  recoverable: boolean;
}

export interface TransactionValidationResult {
  validTransactions: OFXTransaction[];
  invalidTransactions: number;
  errors: ImportValidationError[];
}

export interface ImportSummary {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  duplicateTransactions: number;
  uniqueTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
}

export type TransactionAction = 'import' | 'skip' | 'review';
