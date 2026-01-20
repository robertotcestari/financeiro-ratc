/**
 * Integration tests for OFX Duplicate Detection Service
 * Tests the service with real database interactions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/core/database/client';
import { DuplicateDetectionService } from '@/lib/features/ofx/duplicate-detection';
import type { OFXTransaction } from '@/lib/features/ofx/types';

const describeDb =
  process.env.VITEST_SKIP_DB_TESTS === 'true' ? describe.skip : describe;

describeDb('DuplicateDetectionService Integration', () => {
  let service: DuplicateDetectionService;
  let testBankAccountId: string;

  beforeEach(async () => {
    service = new DuplicateDetectionService();

    // Create a test bank account with unique name
    const uniqueName = `Test Bank Account ${Date.now()}-${Math.random()}`;
    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: uniqueName,
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });
    testBankAccountId = bankAccount.id;
  });

  afterEach(async () => {
    // Clean up test data
    if (testBankAccountId) {
      try {
        await prisma.transaction.deleteMany({
          where: { bankAccountId: testBankAccountId },
        });
        await prisma.bankAccount.delete({
          where: { id: testBankAccountId },
        });
      } catch (error) {
        // Ignore cleanup errors in tests
        console.warn('Test cleanup error:', error);
      }
    }
  });

  describe('findDuplicates with real database', () => {
    it('should detect exact OFX transaction ID duplicates', async () => {
      // Create an existing transaction with OFX ID
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-15'),
          description: 'Coffee Shop Purchase',
          amount: 25.5,
          ofxTransId: 'OFX123456789',
          ofxAccountId: 'ACC001',
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123456789',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 25.5,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const result = await service.findDuplicates(
        [ofxTransaction],
        testBankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].isExactMatch).toBe(true);
      expect(result.duplicates[0].confidence).toBe(1.0);
      expect(result.duplicates[0].matchCriteria).toContain(
        'ofx_transaction_id'
      );
      expect(result.summary.exactMatches).toBe(1);
      expect(result.summary.unique).toBe(0);
    });

    it('should detect fuzzy duplicates based on date, amount, and description', async () => {
      // Create an existing transaction without OFX ID
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-15'),
          description: 'Starbucks Coffee Purchase',
          amount: 4.75,
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX987654321',
        accountId: 'ACC002',
        date: new Date('2024-01-15'),
        amount: 4.75,
        description: 'Starbucks Coffee Purchase',
        type: 'DEBIT',
      };

      const result = await service.findDuplicates(
        [ofxTransaction],
        testBankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].isExactMatch).toBe(false);
      expect(result.duplicates[0].confidence).toBeGreaterThan(0.8);
      expect(result.duplicates[0].matchCriteria).toContain('exact_date');
      expect(result.duplicates[0].matchCriteria).toContain('exact_amount');
      expect(result.duplicates[0].matchCriteria).toContain('exact_description');
    });

    it('should handle date tolerance for fuzzy matching', async () => {
      // Create an existing transaction 1 day earlier
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-14'),
          description: 'Gas Station',
          amount: 45.0,
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX555666777',
        accountId: 'ACC003',
        date: new Date('2024-01-15'),
        amount: 45.0,
        description: 'Gas Station',
        type: 'DEBIT',
      };

      const result = await service.findDuplicates(
        [ofxTransaction],
        testBankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].isExactMatch).toBe(false);
      expect(result.duplicates[0].confidence).toBeGreaterThan(0.7);
      expect(result.duplicates[0].matchCriteria).toContain('similar_date');
      expect(result.duplicates[0].matchCriteria).toContain('exact_amount');
      expect(result.duplicates[0].matchCriteria).toContain('exact_description');
    });

    it('should not match transactions outside date tolerance', async () => {
      // Create an existing transaction 5 days earlier (outside tolerance)
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-10'),
          description: 'Grocery Store',
          amount: 85.25,
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX111222333',
        accountId: 'ACC004',
        date: new Date('2024-01-15'),
        amount: 85.25,
        description: 'Grocery Store',
        type: 'DEBIT',
      };

      const result = await service.findDuplicates(
        [ofxTransaction],
        testBankAccountId
      );

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
      expect(result.summary.unique).toBe(1);
    });

    it('should filter out low confidence matches', async () => {
      // Create a transaction with same amount but very different description and date
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-12'), // 3 days difference
          description: 'Completely Different Transaction',
          amount: 50.0,
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX777888999',
        accountId: 'ACC006',
        date: new Date('2024-01-15'),
        amount: 50.0,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const result = await service.findDuplicates(
        [ofxTransaction],
        testBankAccountId
      );

      // Should not match due to low confidence
      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
    });

    it('should handle mixed batch with duplicates and unique transactions', async () => {
      // Ensure testBankAccountId exists
      if (!testBankAccountId) {
        throw new Error('Test bank account not initialized');
      }

      // Create some existing transactions
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-15'),
          description: 'Existing Transaction 1',
          amount: 100.0,
          ofxTransId: 'EXISTING1',
        },
      });

      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-16'),
          description: 'Existing Transaction 2',
          amount: 200.0,
        },
      });

      const ofxTransactions: OFXTransaction[] = [
        {
          transactionId: 'EXISTING1', // Exact match
          accountId: 'ACC001',
          date: new Date('2024-01-15'),
          amount: 100.0,
          description: 'Existing Transaction 1',
          type: 'DEBIT',
        },
        {
          transactionId: 'NEW1', // Fuzzy match
          accountId: 'ACC001',
          date: new Date('2024-01-16'),
          amount: 200.0,
          description: 'Existing Transaction 2',
          type: 'DEBIT',
        },
        {
          transactionId: 'NEW2', // Unique
          accountId: 'ACC001',
          date: new Date('2024-01-17'),
          amount: 300.0,
          description: 'Brand New Transaction',
          type: 'DEBIT',
        },
      ];

      const result = await service.findDuplicates(
        ofxTransactions,
        testBankAccountId
      );

      expect(result.summary.total).toBe(3);
      expect(result.summary.duplicates).toBe(2);
      expect(result.summary.unique).toBe(1);
      expect(result.summary.exactMatches).toBe(1);
      expect(result.summary.potentialMatches).toBe(1);
    });
  });

  describe('checkSingleTransaction with real database', () => {
    it('should return true for existing OFX transaction ID', async () => {
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-15'),
          description: 'Test Transaction',
          amount: 75.5,
          ofxTransId: 'SINGLE_TEST_123',
        },
      });

      const ofxTransaction: OFXTransaction = {
        transactionId: 'SINGLE_TEST_123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 75.5,
        description: 'Test Transaction',
        type: 'DEBIT',
      };

      const result = await service.checkSingleTransaction(
        ofxTransaction,
        testBankAccountId
      );
      expect(result).toBe(true);
    });

    it('should return false for unique transaction', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'UNIQUE_TRANS_456',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 125.75,
        description: 'Unique Transaction',
        type: 'DEBIT',
      };

      const result = await service.checkSingleTransaction(
        ofxTransaction,
        testBankAccountId
      );
      expect(result).toBe(false);
    });
  });

  describe('generateDuplicatePreview with real database', () => {
    it('should generate correct preview recommendations', async () => {
      // Create existing transactions for different scenarios
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-15'),
          description: 'Exact Match Transaction',
          amount: 50.0,
          ofxTransId: 'EXACT_MATCH_123',
        },
      });

      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccountId,
          date: new Date('2024-01-16'),
          description: 'High Confidence Match',
          amount: 75.0,
        },
      });

      const ofxTransactions: OFXTransaction[] = [
        {
          transactionId: 'EXACT_MATCH_123', // Should be skipped
          accountId: 'ACC001',
          date: new Date('2024-01-15'),
          amount: 50.0,
          description: 'Exact Match Transaction',
          type: 'DEBIT',
        },
        {
          transactionId: 'HIGH_CONF_456', // Should be reviewed
          accountId: 'ACC001',
          date: new Date('2024-01-16'),
          amount: 75.0,
          description: 'High Confidence Match',
          type: 'DEBIT',
        },
        {
          transactionId: 'UNIQUE_789', // Should be imported
          accountId: 'ACC001',
          date: new Date('2024-01-17'),
          amount: 100.0,
          description: 'Completely Unique Transaction',
          type: 'DEBIT',
        },
      ];

      const previews = await service.generateDuplicatePreview(
        ofxTransactions,
        testBankAccountId
      );

      expect(previews).toHaveLength(3);

      // Exact match should be skipped
      const exactMatchPreview = previews.find(
        (p) => p.transaction.transactionId === 'EXACT_MATCH_123'
      );
      expect(exactMatchPreview?.recommendation).toBe('skip');
      expect(exactMatchPreview?.reason).toContain(
        'Exact OFX transaction ID match found'
      );

      // High confidence match should be reviewed
      const highConfPreview = previews.find(
        (p) => p.transaction.transactionId === 'HIGH_CONF_456'
      );
      expect(highConfPreview?.recommendation).toBe('review');
      expect(highConfPreview?.reason).toContain(
        'confidence duplicate detected'
      );

      // Unique transaction should be imported
      const uniquePreview = previews.find(
        (p) => p.transaction.transactionId === 'UNIQUE_789'
      );
      expect(uniquePreview?.recommendation).toBe('import');
      expect(uniquePreview?.reason).toBe('No duplicates found');
    });
  });
});
