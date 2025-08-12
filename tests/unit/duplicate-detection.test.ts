/**
 * Unit tests for OFX Duplicate Detection Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { OFXTransaction } from '@/lib/ofx/types';
import type { Transaction } from '@/app/generated/prisma';

// Mock Prisma client
const mockTransaction = {
  findFirst: vi.fn(),
  findMany: vi.fn(),
};

vi.mock('@/lib/database/client', () => ({
  prisma: {
    transaction: mockTransaction,
  },
}));

// Import after mocking
const { DuplicateDetectionService } = await import(
  '@/lib/ofx/duplicate-detection'
);

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  const bankAccountId = 'test-bank-account-id';

  beforeEach(() => {
    service = new DuplicateDetectionService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('findDuplicates', () => {
    it('should identify exact OFX transaction ID matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123456',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Test Transaction',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Test Transaction',
        amount: 100.5,
        balance: null,
        ofxTransId: 'OFX123456',
        ofxAccountId: 'ACC001',
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(existingTransaction);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].isExactMatch).toBe(true);
      expect(result.duplicates[0].confidence).toBe(1.0);
      expect(result.duplicates[0].matchCriteria).toContain(
        'ofx_transaction_id'
      );
      expect(result.uniqueTransactions).toHaveLength(0);
      expect(result.summary.exactMatches).toBe(1);
    });

    it('should identify fuzzy matches based on date, amount, and description', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX789',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-456',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Coffee Shop Purchase',
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      // Mock exact match not found
      mockTransaction.findFirst.mockResolvedValue(null);
      // Mock fuzzy match found
      mockTransaction.findMany.mockResolvedValue([existingTransaction]);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].isExactMatch).toBe(false);
      expect(result.duplicates[0].confidence).toBeGreaterThan(0.8);
      expect(result.duplicates[0].matchCriteria).toContain('exact_date');
      expect(result.duplicates[0].matchCriteria).toContain('exact_amount');
      expect(result.duplicates[0].matchCriteria).toContain('exact_description');
    });

    it('should handle transactions with no duplicates', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX999',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 50.25,
        description: 'Unique Transaction',
        type: 'DEBIT',
      };

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([]);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
      expect(result.uniqueTransactions[0]).toEqual(ofxTransaction);
      expect(result.summary.unique).toBe(1);
      expect(result.summary.duplicates).toBe(0);
    });

    it('should filter out low confidence matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX111',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Coffee Shop',
        type: 'DEBIT',
      };

      const lowConfidenceMatch: Transaction = {
        id: 'existing-low',
        bankAccountId,
        date: new Date('2024-01-18'), // 3 days difference
        description: 'Restaurant Bill', // Very different description
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([lowConfidenceMatch]);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(0);
      expect(result.uniqueTransactions).toHaveLength(1);
    });
  });

  describe('checkSingleTransaction', () => {
    it('should return true for duplicate transactions', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Test Transaction',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Test Transaction',
        amount: 100.5,
        balance: null,
        ofxTransId: 'OFX123',
        ofxAccountId: 'ACC001',
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(existingTransaction);

      const result = await service.checkSingleTransaction(
        ofxTransaction,
        bankAccountId
      );

      expect(result).toBe(true);
    });

    it('should return false for unique transactions', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX999',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 50.25,
        description: 'Unique Transaction',
        type: 'DEBIT',
      };

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([]);

      const result = await service.checkSingleTransaction(
        ofxTransaction,
        bankAccountId
      );

      expect(result).toBe(false);
    });
  });

  describe('generateDuplicatePreview', () => {
    it('should generate preview with skip recommendation for exact matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Test Transaction',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Test Transaction',
        amount: 100.5,
        balance: null,
        ofxTransId: 'OFX123',
        ofxAccountId: 'ACC001',
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(existingTransaction);

      const result = await service.generateDuplicatePreview(
        [ofxTransaction],
        bankAccountId
      );

      expect(result).toHaveLength(1);
      expect(result[0].recommendation).toBe('skip');
      expect(result[0].reason).toContain(
        'Exact OFX transaction ID match found'
      );
      expect(result[0].matches).toHaveLength(1);
      expect(result[0].matches[0].isExactMatch).toBe(true);
    });

    it('should generate preview with import recommendation for unique transactions', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX999',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 50.25,
        description: 'Unique Transaction',
        type: 'DEBIT',
      };

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([]);

      const result = await service.generateDuplicatePreview(
        [ofxTransaction],
        bankAccountId
      );

      expect(result).toHaveLength(1);
      expect(result[0].recommendation).toBe('import');
      expect(result[0].reason).toBe('No duplicates found');
      expect(result[0].matches).toHaveLength(0);
    });

    it('should generate preview with review recommendation for potential matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX456',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const potentialMatch: Transaction = {
        id: 'existing-456',
        bankAccountId,
        date: new Date('2024-01-16'), // 1 day difference
        description: 'Coffee Shop Purchase',
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([potentialMatch]);

      const result = await service.generateDuplicatePreview(
        [ofxTransaction],
        bankAccountId
      );

      expect(result).toHaveLength(1);
      expect(result[0].recommendation).toBe('review');
      expect(result[0].reason).toContain('confidence duplicate detected');
      expect(result[0].matches).toHaveLength(1);
      expect(result[0].matches[0].isExactMatch).toBe(false);
    });
  });

  describe('confidence scoring', () => {
    it('should calculate high confidence for exact matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const exactMatch: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Coffee Shop Purchase',
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([exactMatch]);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBeGreaterThan(0.9);
    });

    it('should calculate medium confidence for partial matches', async () => {
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Coffee Shop Purchase',
        type: 'DEBIT',
      };

      const partialMatch: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-16'), // 1 day difference
        description: 'Coffee Shop', // Partial description match
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      mockTransaction.findFirst.mockResolvedValue(null);
      mockTransaction.findMany.mockResolvedValue([partialMatch]);

      const result = await service.findDuplicates(
        [ofxTransaction],
        bankAccountId
      );

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].confidence).toBeGreaterThan(0.6);
      expect(result.duplicates[0].confidence).toBeLessThan(0.9);
    });
  });

  describe('string similarity', () => {
    it('should calculate correct similarity for identical strings', () => {
      const service = new DuplicateDetectionService();
      // Access private method for testing
      const similarity = (service as any).calculateStringSimilarity(
        'Coffee Shop',
        'Coffee Shop'
      );
      expect(similarity).toBe(1.0);
    });

    it('should calculate correct similarity for similar strings', () => {
      const service = new DuplicateDetectionService();
      const similarity = (service as any).calculateStringSimilarity(
        'Coffee Shop',
        'Coffee'
      );
      expect(similarity).toBeGreaterThan(0.5);
      expect(similarity).toBeLessThan(1.0);
    });

    it('should calculate correct similarity for different strings', () => {
      const service = new DuplicateDetectionService();
      const similarity = (service as any).calculateStringSimilarity(
        'Coffee Shop',
        'Restaurant Bill'
      );
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle empty strings', () => {
      const service = new DuplicateDetectionService();
      const similarity = (service as any).calculateStringSimilarity(
        '',
        'Coffee Shop'
      );
      expect(similarity).toBe(0);
    });
  });

  describe('match criteria', () => {
    it('should identify exact date matches', () => {
      const service = new DuplicateDetectionService();
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Test',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-15'),
        description: 'Test',
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      const criteria = (service as any).getMatchCriteria(
        ofxTransaction,
        existingTransaction
      );
      expect(criteria).toContain('exact_date');
      expect(criteria).toContain('exact_amount');
      expect(criteria).toContain('exact_description');
    });

    it('should identify similar date matches', () => {
      const service = new DuplicateDetectionService();
      const ofxTransaction: OFXTransaction = {
        transactionId: 'OFX123',
        accountId: 'ACC001',
        date: new Date('2024-01-15'),
        amount: 100.5,
        description: 'Test',
        type: 'DEBIT',
      };

      const existingTransaction: Transaction = {
        id: 'existing-123',
        bankAccountId,
        date: new Date('2024-01-16'), // 1 day difference
        description: 'Test',
        amount: 100.5,
        balance: null,
        ofxTransId: null,
        ofxAccountId: null,
        importBatchId: null,
        isDuplicate: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Transaction;

      const criteria = (service as any).getMatchCriteria(
        ofxTransaction,
        existingTransaction
      );
      expect(criteria).toContain('similar_date');
      expect(criteria).toContain('exact_amount');
      expect(criteria).toContain('exact_description');
    });
  });
});
