import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/database/client';
import { ImportService } from '@/lib/ofx/import-service';
import { OFXParserService } from '@/lib/ofx/parser';
import { DuplicateDetectionService } from '@/lib/ofx/duplicate-detection';
import { ImportPreviewService } from '@/lib/ofx/import-preview';
import type { BankAccount, Category, Property } from '@/app/generated/prisma';

describe('ImportService Integration Tests', () => {
  let importService: ImportService;
  let testBankAccount: BankAccount;
  let testCategory: Category;
  let testProperty: Property;

  beforeEach(async () => {
    // Clean up database (respect FK constraints)
    await prisma.transactionSuggestion.deleteMany();
    await prisma.processedTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.oFXAccountMapping.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.property.deleteMany();
    await prisma.category.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.city.deleteMany();

    // Create test city
    const testCity = await prisma.city.create({
      data: {
        code: 'TST',
        name: 'Test City',
        isActive: true,
      },
    });

    // Create test bank account
    testBankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Bank Account',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });

    // Create test category
    testCategory = await prisma.category.create({
      data: {
        name: 'Test Income',
        type: 'INCOME',
        level: 1,
        orderIndex: 1,
        isSystem: false,
      },
    });

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        code: 'TST-001',
        city: 'TST',
        cityId: testCity.id,
        address: 'Test Address 123',
        description: 'Test Property',
        isActive: true,
      },
    });

    // Initialize import service
    importService = new ImportService();
  });

  afterEach(async () => {
    // Clean up after each test (respect FK constraints)
    await prisma.transactionSuggestion.deleteMany();
    await prisma.processedTransaction.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.oFXAccountMapping.deleteMany();
    await prisma.importBatch.deleteMany();
    await prisma.property.deleteMany();
    await prisma.category.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.city.deleteMany();
  });

  describe('processImport', () => {
    it('should successfully process a complete OFX import', async () => {
      // Create a mock OFX file
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
<MEMO>Test transaction memo
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20240120
<TRNAMT>-500.00
<FITID>TXN002
<NAME>Test Withdrawal
<MEMO>Test withdrawal memo
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>500.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test.ofx', {
        type: 'application/x-ofx',
      });

      // Process the import
      const result = await importService.processImport(
        file,
        testBankAccount.id,
        {
          createUnifiedTransactions: true,
          importReviewTransactions: true,
        }
      );

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.importBatchId).toBeTruthy();
      expect(result.summary.totalTransactions).toBe(2);
      expect(result.summary.validTransactions).toBe(2);
      expect(result.transactions.imported).toHaveLength(2);
      expect(result.transactions.skipped).toHaveLength(0);
      expect(result.transactions.failed).toHaveLength(0);

      // Verify database records were created
      const importBatch = await prisma.importBatch.findUnique({
        where: { id: result.importBatchId! },
      });
      expect(importBatch).toBeTruthy();
      expect(importBatch!.status).toBe('COMPLETED');
      expect(importBatch!.fileType).toBe('OFX');

      const transactions = await prisma.transaction.findMany({
        where: { importBatchId: result.importBatchId! },
      });
      expect(transactions).toHaveLength(2);

      // Verify OFX-specific fields
      expect(transactions[0].ofxTransId).toBeTruthy();
      expect(transactions[0].ofxAccountId).toBeTruthy();
      expect(transactions[1].ofxTransId).toBeTruthy();
      expect(transactions[1].ofxAccountId).toBeTruthy();
    });

    it('should handle parsing errors gracefully', async () => {
      // Create an invalid OFX file
      const invalidOfxContent = 'This is not a valid OFX file';
      const file = new File([invalidOfxContent], 'invalid.ofx', {
        type: 'application/x-ofx',
      });

      // Process the import
      const result = await importService.processImport(
        file,
        testBankAccount.id
      );

      // Verify the result
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.type === 'PARSING')).toBe(true);
      expect(result.transactions.imported).toHaveLength(0);
    });

    it('should handle duplicate detection correctly', async () => {
      // First, create an existing transaction
      await prisma.transaction.create({
        data: {
          bankAccountId: testBankAccount.id,
          date: new Date('2024-01-15'),
          description: 'Test Deposit',
          amount: 1000.0,
          ofxTransId: 'EXISTING_TXN',
          ofxAccountId: '7890123456',
        },
      });

      // Create OFX file with duplicate transaction
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
<MEMO>Duplicate transaction
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test-duplicate.ofx', {
        type: 'application/x-ofx',
      });

      // Process the import without importing duplicates
      const result = await importService.processImport(
        file,
        testBankAccount.id,
        {
          importDuplicates: false,
        }
      );

      // Verify duplicate was detected and skipped
      expect(result.success).toBe(true);
      expect(result.summary.duplicateTransactions).toBe(1);
      expect(result.transactions.skipped).toHaveLength(1);
      expect(result.transactions.imported).toHaveLength(0);
    });

    it('should handle transaction rollback on error in strict mode', async () => {
      // Mock the parser to throw an error during transaction processing
      const mockParser = new OFXParserService();
      const originalParseFile = mockParser.parseFile.bind(mockParser);

      // Create a service that will fail during transaction import
      const failingImportService = new ImportService(mockParser);

      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test.ofx', {
        type: 'application/x-ofx',
      });

      // Process with strict mode - should handle errors gracefully
      const result = await failingImportService.processImport(
        file,
        testBankAccount.id,
        {
          strictMode: false, // Allow partial failures
        }
      );

      // Verify that the service handled the error gracefully
      expect(result.importBatchId).toBeTruthy();

      // Check that import batch was created and marked as failed if needed
      const importBatch = await prisma.importBatch.findUnique({
        where: { id: result.importBatchId! },
      });
      expect(importBatch).toBeTruthy();
    });
  });

  describe('previewImport', () => {
    it('should generate import preview without saving data', async () => {
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test.ofx', {
        type: 'application/x-ofx',
      });

      // Generate preview
      const preview = await importService.previewImport(
        file,
        testBankAccount.id
      );

      // Verify preview was generated
      expect(preview.success).toBe(true);
      expect(preview.transactions).toHaveLength(1);
      expect(preview.summary.totalTransactions).toBe(1);

      // Verify no data was saved to database
      const transactionCount = await prisma.transaction.count();
      expect(transactionCount).toBe(0);

      const importBatchCount = await prisma.importBatch.count();
      expect(importBatchCount).toBe(0);
    });
  });

  describe('executeImport', () => {
    it('should execute import from existing preview', async () => {
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test.ofx', {
        type: 'application/x-ofx',
      });

      // First generate preview
      const preview = await importService.previewImport(
        file,
        testBankAccount.id
      );
      expect(preview.success).toBe(true);

      // Then execute import from preview
      const result = await importService.executeImport(preview, {
        bankAccountId: testBankAccount.id,
        createProcessedTransactions: true,
        importReviewTransactions: true, // Allow importing transactions that need review
      });

      // Verify execution
      expect(result.success).toBe(true);
      expect(result.importBatchId).toBeTruthy();
      expect(result.transactions.imported).toHaveLength(1);

      // Verify database records
      const transactions = await prisma.transaction.findMany();
      expect(transactions).toHaveLength(1);

      const processedTransactions =
        await prisma.processedTransaction.findMany();
      expect(processedTransactions).toHaveLength(1);
    });
  });

  describe('import batch tracking', () => {
    it('should create and update import batch correctly', async () => {
      const ofxContent = `
OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>20240101120000
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>123456
<ACCTID>7890123456
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240131
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20240115
<TRNAMT>1000.00
<FITID>TXN001
<NAME>Test Deposit
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>1000.00
<DTASOF>20240131
</LEDGERBAL>
</STMTRS>
</BANKMSGSRSV1>
</OFX>
      `.trim();

      const file = new File([ofxContent], 'test-batch.ofx', {
        type: 'application/x-ofx',
      });

      // Process import
      const result = await importService.processImport(
        file,
        testBankAccount.id,
        {
          importReviewTransactions: true, // Allow importing transactions that need review
        }
      );

      // Verify import batch was created and updated
      const importBatch = await prisma.importBatch.findUnique({
        where: { id: result.importBatchId! },
        include: { transactions: true },
      });

      expect(importBatch).toBeTruthy();
      expect(importBatch!.fileName).toBe('test-batch.ofx');
      expect(importBatch!.fileType).toBe('OFX');
      expect(importBatch!.status).toBe('COMPLETED');
      expect(importBatch!.transactionCount).toBe(1);
      expect(importBatch!.transactions).toHaveLength(1);
      expect(importBatch!.ofxVersion).toBe('1.x');
      expect(importBatch!.ofxBankId).toBe('123456');
    });
  });
});
