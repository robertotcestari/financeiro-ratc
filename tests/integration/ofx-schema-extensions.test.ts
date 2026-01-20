import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/core/database/client';

const describeDb =
  process.env.VITEST_SKIP_DB_TESTS === 'true' ? describe.skip : describe;

describeDb('OFX Schema Extensions', () => {
  beforeEach(async () => {
    // Clean up test data in correct order (respecting foreign key constraints)
    await prisma.transactionSuggestion.deleteMany();
    await prisma.processedTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.oFXAccountMapping.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.bankAccount.deleteMany();
  });

  it('should create transaction with OFX fields', async () => {
    // Create a bank account first
    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Bank Account',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
      },
    });

    // Create transaction with OFX fields
    const transaction = await prisma.transaction.create({
      data: {
        bankAccountId: bankAccount.id,
        date: new Date('2024-01-01'),
        description: 'Test OFX Transaction',
        amount: 100.5,
        ofxTransId: 'TXN123456',
        ofxAccountId: 'OFX123456',
      },
    });

    expect(transaction).toBeDefined();
    expect(transaction.ofxTransId).toBe('TXN123456');
    expect(transaction.ofxAccountId).toBe('OFX123456');
  });

  it('should create import batch with OFX metadata', async () => {
    // Create import batch with OFX fields
    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: 'test.ofx',
        fileSize: 1024,
        bankAccountId: 'test-account-id',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        transactionCount: 10,
        status: 'COMPLETED',
        fileType: 'OFX',
        ofxVersion: '2.0',
        ofxBankId: 'BANK001',
      },
    });

    expect(importBatch).toBeDefined();
    expect(importBatch.fileType).toBe('OFX');
    expect(importBatch.ofxVersion).toBe('2.0');
    expect(importBatch.ofxBankId).toBe('BANK001');
  });

  it('should enforce unique constraint on OFX account mapping', async () => {
    // Create a bank account first
    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Bank Account',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
      },
    });

    // Create first mapping
    await prisma.oFXAccountMapping.create({
      data: {
        ofxAccountId: 'OFX123456',
        ofxBankId: 'BANK001',
        bankAccountId: bankAccount.id,
      },
    });

    // Try to create duplicate mapping - should fail
    await expect(
      prisma.oFXAccountMapping.create({
        data: {
          ofxAccountId: 'OFX123456',
          ofxBankId: 'BANK001',
          bankAccountId: bankAccount.id,
        },
      })
    ).rejects.toThrow();
  });

  it('should allow querying transactions by OFX fields', async () => {
    // Create a bank account first
    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Bank Account',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
      },
    });

    // Create transactions with OFX fields
    await prisma.transaction.createMany({
      data: [
        {
          bankAccountId: bankAccount.id,
          date: new Date('2024-01-01'),
          description: 'OFX Transaction 1',
          amount: 100.0,
          ofxTransId: 'TXN001',
          ofxAccountId: 'OFX123456',
        },
        {
          bankAccountId: bankAccount.id,
          date: new Date('2024-01-02'),
          description: 'OFX Transaction 2',
          amount: 200.0,
          ofxTransId: 'TXN002',
          ofxAccountId: 'OFX123456',
        },
      ],
    });

    // Query by OFX transaction ID
    const transactionByOfxId = await prisma.transaction.findFirst({
      where: { ofxTransId: 'TXN001' },
    });
    expect(transactionByOfxId).toBeDefined();
    expect(transactionByOfxId?.description).toBe('OFX Transaction 1');

    // Query by OFX account ID
    const transactionsByAccount = await prisma.transaction.findMany({
      where: { ofxAccountId: 'OFX123456' },
    });
    expect(transactionsByAccount).toHaveLength(2);
  });
});
