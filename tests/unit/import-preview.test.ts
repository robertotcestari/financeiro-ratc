import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from 'vitest';
import { ImportPreviewService } from '@/lib/ofx/import-preview';
import { OFXParserService } from '@/lib/ofx/parser';
import { DuplicateDetectionService } from '@/lib/ofx/duplicate-detection';
import { prisma } from '@/lib/database/client';
import type {
  OFXTransaction,
  OFXParseResult,
  DuplicateDetectionResult,
} from '@/lib/ofx/types';
import type { BankAccount, Category, Property } from '@/app/generated/prisma';

// Mock dependencies
vi.mock('@/lib/database/client', () => ({
  prisma: {
    bankAccount: {
      findUnique: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
    },
    property: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/ofx/parser');
vi.mock('@/lib/ofx/duplicate-detection');

describe('ImportPreviewService', () => {
  let service: ImportPreviewService;
  let mockParser: OFXParserService;
  let mockDuplicateDetection: DuplicateDetectionService;

  const mockBankAccount: BankAccount = {
    id: 'bank-1',
    name: 'Test Bank Account',
    bankName: 'Test Bank',
    accountType: 'CHECKING',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategories: Category[] = [
    {
      id: 'cat-income',
      name: 'Income',
      type: 'INCOME',
      parentId: null,
      level: 1,
      orderIndex: 1,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-expense',
      name: 'Expense',
      type: 'EXPENSE',
      parentId: null,
      level: 1,
      orderIndex: 2,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-transfer',
      name: 'Transfer',
      type: 'TRANSFER',
      parentId: null,
      level: 1,
      orderIndex: 3,
      isSystem: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockProperties: Property[] = [
    {
      id: 'prop-1',
      code: 'CAT - Test Property',
      city: 'CAT',
      cityId: 'city-1',
      address: 'Test Address',
      description: 'Test Property',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOFXTransaction: OFXTransaction = {
    transactionId: 'txn-1',
    accountId: 'acc-1',
    date: new Date('2024-01-15'),
    amount: 100.5,
    description: 'Test Transaction',
    type: 'DEBIT',
    memo: 'Test memo',
  };

  const mockParseResult: OFXParseResult = {
    success: true,
    version: '2.x',
    format: 'XML',
    accounts: [],
    transactions: [mockOFXTransaction],
    errors: [],
  };

  const mockDuplicateResult: DuplicateDetectionResult = {
    duplicates: [],
    uniqueTransactions: [mockOFXTransaction],
    summary: {
      total: 1,
      duplicates: 0,
      unique: 1,
      exactMatches: 0,
      potentialMatches: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock instances
    mockParser = {
      parseFile: vi.fn().mockResolvedValue(mockParseResult),
      validateFormat: vi.fn(),
      detectVersion: vi.fn(),
    } as any;

    mockDuplicateDetection = {
      findDuplicates: vi.fn().mockResolvedValue(mockDuplicateResult),
      checkSingleTransaction: vi.fn(),
    } as any;

    service = new ImportPreviewService(mockParser, mockDuplicateDetection);

    // Mock prisma calls
    (prisma.bankAccount.findUnique as MockedFunction<any>).mockResolvedValue(
      mockBankAccount
    );
    (prisma.category.findMany as MockedFunction<any>).mockResolvedValue(
      mockCategories
    );
    (prisma.property.findMany as MockedFunction<any>).mockResolvedValue(
      mockProperties
    );
  });

  describe('generatePreview', () => {
    it('should generate successful preview for valid OFX file', async () => {
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.success).toBe(true);
      expect(result.bankAccount).toEqual(mockBankAccount);
      expect(result.transactions).toHaveLength(1);
      expect(result.summary.totalTransactions).toBe(1);
      expect(result.summary.validTransactions).toBe(1);
      expect(result.summary.invalidTransactions).toBe(0);
    });

    it('should handle invalid bank account', async () => {
      (prisma.bankAccount.findUnique as MockedFunction<any>).mockResolvedValue(
        null
      );
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'invalid-bank');

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('PREVIEW_GENERATION_ERROR');
      expect(result.validationErrors[0].message).toContain(
        'Bank account with ID invalid-bank not found'
      );
    });

    it('should handle inactive bank account', async () => {
      const inactiveBankAccount = { ...mockBankAccount, isActive: false };
      (prisma.bankAccount.findUnique as MockedFunction<any>).mockResolvedValue(
        inactiveBankAccount
      );
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('PREVIEW_GENERATION_ERROR');
      expect(result.validationErrors[0].message).toContain(
        'Bank account Test Bank Account is not active'
      );
    });

    it('should handle parsing errors', async () => {
      const parseResultWithErrors: OFXParseResult = {
        success: false,
        version: '1.x',
        format: 'SGML',
        accounts: [],
        transactions: [],
        errors: [
          {
            type: 'PARSING',
            code: 'INVALID_FORMAT',
            message: 'Invalid OFX format',
            line: 1,
          },
        ],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResultWithErrors);
      const mockFile = new File(['invalid content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('INVALID_FORMAT');
      expect(result.summary.invalidTransactions).toBe(1);
    });

    it('should handle system errors gracefully', async () => {
      mockParser.parseFile = vi
        .fn()
        .mockRejectedValue(new Error('System error'));
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('PREVIEW_GENERATION_ERROR');
    });
  });

  describe('transaction validation', () => {
    it('should validate transactions with all required fields', async () => {
      const validTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Valid Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [validTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].isValid).toBe(true);
      expect(result.summary.validTransactions).toBe(1);
      expect(result.summary.invalidTransactions).toBe(0);
    });

    it('should identify transactions with missing required fields', async () => {
      const invalidTransaction: OFXTransaction = {
        transactionId: '', // Missing transaction ID
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Invalid Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [invalidTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].isValid).toBe(false);
      expect(result.summary.validTransactions).toBe(0);
      expect(result.summary.invalidTransactions).toBe(1);
      expect(
        result.validationErrors.some(
          (error) => error.code === 'MISSING_TRANSACTION_ID'
        )
      ).toBe(true);
    });

    it('should identify transactions with invalid dates', async () => {
      const invalidTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('invalid-date'),
        amount: 100.5,
        description: 'Invalid Date Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [invalidTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].isValid).toBe(false);
      expect(
        result.validationErrors.some((error) => error.code === 'INVALID_DATE')
      ).toBe(true);
    });

    it('should identify transactions with future dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const futureTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: futureDate,
        amount: 100.5,
        description: 'Future Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [futureTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].isValid).toBe(false);
      expect(
        result.validationErrors.some((error) => error.code === 'FUTURE_DATE')
      ).toBe(true);
    });

    it('should identify transactions with excessive amounts', async () => {
      const largeAmountTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 2000000, // Exceeds maximum
        description: 'Large Amount Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [largeAmountTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].isValid).toBe(false);
      expect(
        result.validationErrors.some(
          (error) => error.code === 'AMOUNT_TOO_LARGE'
        )
      ).toBe(true);
    });
  });

  describe('automatic categorization', () => {
    it('should categorize positive amounts as income', async () => {
      const incomeTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 1000.0,
        description: 'Deposito salario',
        type: 'CREDIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [incomeTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(
        result.transactions[0].categorization.suggestedCategory?.type
      ).toBe('INCOME');
      expect(result.transactions[0].categorization.confidence).toBeGreaterThan(
        0.5
      );
      expect(
        result.transactions[0].categorization.isAutomaticallyCategorized
      ).toBe(true);
    });

    it('should categorize negative amounts as expenses', async () => {
      const expenseTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: -500.0,
        description: 'Pagamento conta luz',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [expenseTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(
        result.transactions[0].categorization.suggestedCategory?.type
      ).toBe('EXPENSE');
      expect(result.transactions[0].categorization.confidence).toBeGreaterThan(
        0.5
      );
      expect(
        result.transactions[0].categorization.isAutomaticallyCategorized
      ).toBe(true);
    });

    it('should categorize transfers based on keywords', async () => {
      const transferTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: -200.0,
        description: 'Transferencia PIX',
        type: 'TRANSFER',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [transferTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(
        result.transactions[0].categorization.suggestedCategory?.type
      ).toBe('TRANSFER');
      expect(result.transactions[0].categorization.confidence).toBeGreaterThan(
        0.7
      );
      expect(
        result.transactions[0].categorization.isAutomaticallyCategorized
      ).toBe(true);
    });

    it('should assign properties based on description keywords', async () => {
      const propertyTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 1500.0,
        description: 'Aluguel CAT - Test Property',
        type: 'CREDIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [propertyTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(
        result.transactions[0].categorization.suggestedProperty?.code
      ).toBe('CAT - Test Property');
      expect(result.transactions[0].categorization.confidence).toBeGreaterThan(
        0.5
      );
    });

    it('should use fallback categorization when no specific rules match', async () => {
      const unknownTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 50.0,
        description: 'Unknown transaction type',
        type: 'OTHER',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [unknownTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      // Should use fallback categorization based on positive amount
      expect(
        result.transactions[0].categorization.suggestedCategory
      ).not.toBeNull();
      expect(
        result.transactions[0].categorization.suggestedCategory?.type
      ).toBe('INCOME');
      expect(result.transactions[0].categorization.confidence).toBeGreaterThan(0.5);
      expect(
        result.transactions[0].categorization.isAutomaticallyCategorized
      ).toBe(true);
      expect(result.transactions[0].categorization.reason).toContain('Fallback by amount sign');
    });
  });

  describe('recommended actions', () => {
    it('should recommend review for invalid transactions', async () => {
      const invalidTransaction: OFXTransaction = {
        transactionId: '', // Invalid
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: 100.0,
        description: 'Invalid Transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [invalidTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].recommendedAction).toBe('review');
    });

    it('should recommend skip for exact duplicate matches', async () => {
      const duplicateResult: DuplicateDetectionResult = {
        duplicates: [
          {
            ofxTransaction: mockOFXTransaction,
            existingTransaction: {} as any,
            confidence: 1.0,
            matchCriteria: ['date', 'amount', 'description'],
            isExactMatch: true,
          },
        ],
        uniqueTransactions: [],
        summary: {
          total: 1,
          duplicates: 1,
          unique: 0,
          exactMatches: 1,
          potentialMatches: 0,
        },
      };

      mockDuplicateDetection.findDuplicates = vi
        .fn()
        .mockResolvedValue(duplicateResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].recommendedAction).toBe('skip');
    });

    it('should recommend import for all valid non-duplicate transactions', async () => {
      const validTransaction: OFXTransaction = {
        transactionId: 'txn-1',
        accountId: 'acc-1',
        date: new Date('2024-01-15'),
        amount: -100.0,
        description: 'Any valid transaction',
        type: 'DEBIT',
      };

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions: [validTransaction],
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.transactions[0].recommendedAction).toBe('import');
    });
  });

  describe('summary generation', () => {
    it('should generate accurate summary statistics', async () => {
      const transactions: OFXTransaction[] = [
        {
          transactionId: 'txn-1',
          accountId: 'acc-1',
          date: new Date('2024-01-15'),
          amount: 1000.0,
          description: 'Deposito salario', // Will be categorized
          type: 'CREDIT',
        },
        {
          transactionId: 'txn-2',
          accountId: 'acc-1',
          date: new Date('2024-01-16'),
          amount: 50.0,
          description: 'Unknown transaction', // Won't be categorized
          type: 'OTHER',
        },
        {
          transactionId: '', // Invalid
          accountId: 'acc-1',
          date: new Date('2024-01-17'),
          amount: 25.0,
          description: 'Invalid transaction',
          type: 'DEBIT',
        },
      ];

      const parseResult: OFXParseResult = {
        ...mockParseResult,
        transactions,
      };

      mockParser.parseFile = vi.fn().mockResolvedValue(parseResult);
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await service.generatePreview(mockFile, 'bank-1');

      expect(result.summary.totalTransactions).toBe(3);
      expect(result.summary.validTransactions).toBe(2);
      expect(result.summary.invalidTransactions).toBe(1);
      // All transactions with positive amounts will be categorized by fallback, including invalid ones
      expect(result.summary.categorizedTransactions).toBe(3);
      expect(result.summary.uncategorizedTransactions).toBe(0);
    });
  });
});
