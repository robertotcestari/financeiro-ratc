import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AccountSelectionService } from '@/lib/features/ofx/account-selection';
import { PrismaClient, AccountType } from '@/app/generated/prisma';

const describeDb =
  process.env.VITEST_SKIP_DB_TESTS === 'true' ? describe.skip : describe;

describeDb('AccountSelectionService Integration Tests', () => {
  let service: AccountSelectionService;
  let prisma: PrismaClient;
  let testBankAccountId: string;
  let testRunId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new AccountSelectionService(prisma);
    testRunId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create a test bank account with unique name
    const testAccount = await prisma.bankAccount.create({
      data: {
        name: `Test Account - Integration - ${testRunId}`,
        bankName: 'Test Bank',
        accountType: AccountType.CHECKING,
        isActive: true,
      },
    });
    testBankAccountId = testAccount.id;
  });

  afterEach(async () => {
    try {
      // Clean up test data - delete mappings first
      await prisma.oFXAccountMapping.deleteMany({
        where: { bankAccountId: testBankAccountId },
      });

      // Delete all test accounts created in this test run
      await prisma.bankAccount.deleteMany({
        where: {
          name: { contains: testRunId },
        },
      });
    } catch (error) {
      // Ignore cleanup errors - records might already be deleted
      console.warn('Cleanup warning:', error);
    }

    await prisma.$disconnect();
  });

  describe('getAllBankAccounts', () => {
    it('should retrieve bank accounts from database', async () => {
      const accounts = await service.getAllBankAccounts();

      expect(accounts).toBeDefined();
      expect(Array.isArray(accounts)).toBe(true);
      expect(accounts.length).toBeGreaterThan(0);

      // Find our test account
      const testAccount = accounts.find((acc) => acc.id === testBankAccountId);
      expect(testAccount).toBeDefined();
      expect(testAccount?.name).toBe(
        `Test Account - Integration - ${testRunId}`
      );
    });
  });

  describe('validateAccountSelection', () => {
    it('should validate existing account', async () => {
      const result = await service.validateAccountSelection(testBankAccountId);

      expect(result.isValid).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.id).toBe(testBankAccountId);
    });

    it('should reject non-existent account', async () => {
      const result = await service.validateAccountSelection('non-existent-id');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Conta bancária não encontrada');
    });
  });

  describe('createNewBankAccount', () => {
    it('should create new bank account in database', async () => {
      const accountData = {
        name: `New Test Account - Integration - ${testRunId}`,
        bankName: 'New Test Bank',
        accountType: AccountType.SAVINGS,
      };

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.name).toBe(accountData.name);
      expect(result.account?.bankName).toBe(accountData.bankName);
      expect(result.account?.accountType).toBe(accountData.accountType);

      // Clean up the created account
      if (result.account) {
        await prisma.bankAccount.delete({
          where: { id: result.account.id },
        });
      }
    });

    it('should reject duplicate account name', async () => {
      const accountData = {
        name: `Test Account - Integration - ${testRunId}`, // Same as existing test account
        bankName: 'Another Bank',
        accountType: AccountType.INVESTMENT,
      };

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Já existe uma conta com esse nome');
    });
  });

  describe('persistAccountSelection', () => {
    it('should update existing OFX account mapping', async () => {
      const ofxAccountId = `TEST_OFX_UPDATE_789_${testRunId}`;
      const ofxBankId = `TEST_BANK_UPDATE_101_${testRunId}`;

      // Create initial mapping
      await prisma.oFXAccountMapping.create({
        data: {
          ofxAccountId,
          ofxBankId,
          bankAccountId: testBankAccountId,
        },
      });

      // Create another test account
      const anotherAccount = await prisma.bankAccount.create({
        data: {
          name: `Another Test Account - Update Mapping - ${testRunId}`,
          bankName: 'Another Bank',
          accountType: AccountType.INVESTMENT,
          isActive: true,
        },
      });

      // Update mapping to point to the new account
      const result = await service.persistAccountSelection(
        anotherAccount.id,
        ofxAccountId,
        ofxBankId
      );

      expect(result.success).toBe(true);

      // Verify mapping was updated
      const mapping = await prisma.oFXAccountMapping.findUnique({
        where: {
          ofxAccountId_ofxBankId: {
            ofxAccountId,
            ofxBankId,
          },
        },
      });

      expect(mapping?.bankAccountId).toBe(anotherAccount.id);

      // Clean up - delete mapping first, then account
      await prisma.oFXAccountMapping.deleteMany({
        where: { bankAccountId: anotherAccount.id },
      });
      await prisma.bankAccount.delete({
        where: { id: anotherAccount.id },
      });
    });
  });

  describe('getExistingAccountMapping', () => {
    it('should return existing mapping', async () => {
      const ofxAccountId = `TEST_EXISTING_UNIQUE_123_${testRunId}`;
      const ofxBankId = `TEST_EXISTING_UNIQUE_BANK_${testRunId}`;

      // Create mapping
      await prisma.oFXAccountMapping.create({
        data: {
          ofxAccountId,
          ofxBankId,
          bankAccountId: testBankAccountId,
        },
      });

      const result = await service.getExistingAccountMapping(
        ofxAccountId,
        ofxBankId
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(testBankAccountId);
    });

    it('should return null for non-existent mapping', async () => {
      const result = await service.getExistingAccountMapping(
        'NON_EXISTENT',
        'BANK'
      );

      expect(result).toBeNull();
    });
  });

  describe('getAccountMappings', () => {
    it('should return empty array for account with no mappings', async () => {
      const result = await service.getAccountMappings(testBankAccountId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});
