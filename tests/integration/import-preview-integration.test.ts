import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportPreviewService } from '@/lib/ofx/import-preview';
import { prisma } from '@/lib/database/client';
import { OFXParserService } from '@/lib/ofx/parser';
import { DuplicateDetectionService } from '@/lib/ofx/duplicate-detection';
import type { OFXParseResult, DuplicateDetectionResult } from '@/lib/ofx/types';
import type { BankAccount, Category, Property } from '@/app/generated/prisma';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ImportPreviewService Integration', () => {
  let testBankAccount: BankAccount;
  let testCategories: Category[];
  let testProperties: Property[];
  let timestamp: number;

  beforeEach(async () => {
    // Create test bank account with unique name
    const uniqueName = `Test Integration Account ${Date.now()}-${Math.random()}`;
    testBankAccount = await prisma.bankAccount.create({
      data: {
        name: uniqueName,
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });

    // Create test categories with unique names
    timestamp = Date.now();
    const incomeCategory = await prisma.category.create({
      data: {
        name: `Test Income ${timestamp}`,
        type: 'INCOME',
        level: 1,
        orderIndex: 1,
      },
    });

    const expenseCategory = await prisma.category.create({
      data: {
        name: `Test Expense ${timestamp}`,
        type: 'EXPENSE',
        level: 1,
        orderIndex: 2,
      },
    });

    const transferCategory = await prisma.category.create({
      data: {
        name: `Test Transfer ${timestamp}`,
        type: 'TRANSFER',
        level: 1,
        orderIndex: 3,
      },
    });

    testCategories = [incomeCategory, expenseCategory, transferCategory];

    // Create test city first (use unique code per run to avoid unique constraint collisions)
    const cityCode = `TST-${Date.now()}-${Math.random()}`;
    const testCity = await prisma.city.create({
      data: {
        code: cityCode,
        name: `Test City ${cityCode}`,
        isActive: true,
      },
    });

    // Create test property
    const testProperty = await prisma.property.create({
      data: {
        code: 'TST - Test Property',
        city: cityCode,
        cityId: testCity.id,
        address: 'Test Address 123',
        description: 'Test Property for Integration',
        isActive: true,
      },
    });

    testProperties = [testProperty];
  });

  afterEach(async () => {
    // Clean up test data in correct order to avoid foreign key constraints
    try {
      // Delete suggestions first due to FK to ProcessedTransaction
      await prisma.transactionSuggestion.deleteMany({});
      await prisma.processedTransaction.deleteMany({});
      await prisma.transaction.deleteMany({});
      await prisma.property.deleteMany({});
      await prisma.city.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.bankAccount.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test cleanup error:', error);
    }
  });

  describe('generatePreview with real database', () => {
    it('should generate preview with real database interactions', async () => {
      // Use a mock parser for integration tests to focus on database interactions
      const mockParser: Pick<OFXParserService, 'parseFile'> = {
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          version: '1.x',
          format: 'SGML',
          accounts: [],
          transactions: [
            {
              transactionId: 'TXN001',
              accountId: 'acc-1',
              date: new Date('2024-01-15'),
              amount: 1500.0,
              description: 'Deposito salario empresa',
              type: 'CREDIT',
              memo: 'Salario mensal',
            },
            {
              transactionId: 'TXN002',
              accountId: 'acc-1',
              date: new Date('2024-01-16'),
              amount: -250.0,
              description: 'Pagamento conta luz',
              type: 'DEBIT',
              memo: 'Conta de energia',
            },
            {
              transactionId: 'TXN003',
              accountId: 'acc-1',
              date: new Date('2024-01-17'),
              amount: -500.0,
              description: 'Transferencia PIX TST - Test Property',
              type: 'TRANSFER',
              memo: 'Pagamento aluguel',
            },
          ],
          errors: [],
        } as OFXParseResult),
      };

      const mockDuplicateDetection: Pick<
        DuplicateDetectionService,
        'findDuplicates'
      > = {
        findDuplicates: vi.fn().mockResolvedValue({
          duplicates: [],
          uniqueTransactions: [],
          summary: {
            total: 3,
            duplicates: 0,
            unique: 3,
            exactMatches: 0,
            potentialMatches: 0,
          },
        } as DuplicateDetectionResult),
      };

      const testService = new ImportPreviewService(
        mockParser as unknown as OFXParserService,
        mockDuplicateDetection as unknown as DuplicateDetectionService
      );
      const mockFile = new File(['test content'], 'test-integration.ofx', {
        type: 'application/x-ofx',
      });

      const result = await testService.generatePreview(
        mockFile,
        testBankAccount.id
      );

      // Verify successful preview generation
      expect(result.success).toBe(true);
      expect(result.bankAccount).toEqual(testBankAccount);
      expect(result.transactions.length).toBe(3);

      // Verify transaction parsing
      const transactions = result.transactions;
      expect(transactions[0].transaction.amount).toBe(1500.0);
      expect(transactions[0].transaction.description).toBe(
        'Deposito salario empresa'
      );
      expect(transactions[1].transaction.amount).toBe(-250.0);
      expect(transactions[1].transaction.description).toBe(
        'Pagamento conta luz'
      );
      expect(transactions[2].transaction.amount).toBe(-500.0);
      expect(transactions[2].transaction.description).toBe(
        'Transferencia PIX TST - Test Property'
      );

      // Verify automatic categorization
      expect(transactions[0].categorization.suggestedCategory?.type).toBe(
        'INCOME'
      );
      expect(transactions[0].categorization.isAutomaticallyCategorized).toBe(
        true
      );

      expect(transactions[1].categorization.suggestedCategory?.type).toBe(
        'EXPENSE'
      );
      expect(transactions[1].categorization.isAutomaticallyCategorized).toBe(
        true
      );

      expect(transactions[2].categorization.suggestedCategory?.type).toBe(
        'TRANSFER'
      );
      expect(transactions[2].categorization.isAutomaticallyCategorized).toBe(
        true
      );

      // Verify property assignment
      expect(transactions[2].categorization.suggestedProperty?.code).toBe(
        'TST - Test Property'
      );

      // Verify summary
      expect(result.summary.totalTransactions).toBe(3);
      expect(result.summary.validTransactions).toBe(3);
      expect(result.summary.invalidTransactions).toBe(0);
      expect(result.summary.categorizedTransactions).toBe(3);
      expect(result.summary.uncategorizedTransactions).toBe(0);
    });

    it('should handle non-existent bank account gracefully', async () => {
      const mockParser: Pick<OFXParserService, 'parseFile'> = {
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          version: '1.x',
          format: 'SGML',
          accounts: [],
          transactions: [
            {
              transactionId: 'TXN001',
              accountId: 'acc-1',
              date: new Date('2024-01-15'),
              amount: 100.0,
              description: 'Test Transaction',
              type: 'CREDIT',
            },
          ],
          errors: [],
        } as OFXParseResult),
      };

      const testService = new ImportPreviewService(
        mockParser as unknown as OFXParserService
      );
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await testService.generatePreview(
        mockFile,
        'non-existent-account-id'
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('PREVIEW_GENERATION_ERROR');
      expect(result.validationErrors[0].message).toContain(
        'Bank account with ID non-existent-account-id not found'
      );
    });

    it('should handle inactive bank account', async () => {
      // Create inactive bank account with unique name
      const uniqueInactiveName = `Inactive Test Account ${Date.now()}-${Math.random()}`;
      const inactiveBankAccount = await prisma.bankAccount.create({
        data: {
          name: uniqueInactiveName,
          bankName: 'Test Bank',
          accountType: 'CHECKING',
          isActive: false,
        },
      });

      const mockParser: Pick<OFXParserService, 'parseFile'> = {
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          version: '1.x',
          format: 'SGML',
          accounts: [],
          transactions: [
            {
              transactionId: 'TXN001',
              accountId: 'acc-1',
              date: new Date('2024-01-15'),
              amount: 100.0,
              description: 'Test Transaction',
              type: 'CREDIT',
            },
          ],
          errors: [],
        } as OFXParseResult),
      };

      const testService = new ImportPreviewService(
        mockParser as unknown as OFXParserService
      );
      const mockFile = new File(['test content'], 'test.ofx', {
        type: 'application/x-ofx',
      });

      const result = await testService.generatePreview(
        mockFile,
        inactiveBankAccount.id
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toHaveLength(1);
      expect(result.validationErrors[0].code).toBe('PREVIEW_GENERATION_ERROR');
      expect(result.validationErrors[0].message).toContain('is not active');
    });
  });

  describe('categorization with real categories', () => {
    it('should use actual categories from database for categorization', async () => {
      const mockParser: Pick<OFXParserService, 'parseFile'> = {
        parseFile: vi.fn().mockResolvedValue({
          success: true,
          version: '1.x',
          format: 'SGML',
          accounts: [],
          transactions: [
            {
              transactionId: 'TXN001',
              accountId: 'acc-1',
              date: new Date('2024-01-15'),
              amount: 2000.0,
              description: 'Deposito receita aluguel',
              type: 'CREDIT',
            },
          ],
          errors: [],
        } as OFXParseResult),
      };

      const mockDuplicateDetection: Pick<
        DuplicateDetectionService,
        'findDuplicates'
      > = {
        findDuplicates: vi.fn().mockResolvedValue({
          duplicates: [],
          uniqueTransactions: [],
          summary: {
            total: 1,
            duplicates: 0,
            unique: 1,
            exactMatches: 0,
            potentialMatches: 0,
          },
        } as DuplicateDetectionResult),
      };

      const testService = new ImportPreviewService(
        mockParser as unknown as OFXParserService,
        mockDuplicateDetection as unknown as DuplicateDetectionService
      );
      const mockFile = new File(['test content'], 'test-categorization.ofx', {
        type: 'application/x-ofx',
      });

      const result = await testService.generatePreview(
        mockFile,
        testBankAccount.id
      );

      expect(result.success).toBe(true);
      expect(result.transactions.length).toBe(1);

      const transaction = result.transactions[0];
      expect(transaction.categorization.suggestedCategory).not.toBeNull();
      expect(transaction.categorization.suggestedCategory?.name).toBe(
        `Test Income ${timestamp}`
      );
      expect(transaction.categorization.suggestedCategory?.type).toBe('INCOME');
      expect(transaction.categorization.isAutomaticallyCategorized).toBe(true);
    });
  });
});
