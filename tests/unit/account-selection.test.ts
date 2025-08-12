import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountSelectionService } from '@/lib/ofx/account-selection';
import { PrismaClient, AccountType } from '@/app/generated/prisma';

// Mock Prisma Client
vi.mock('@/app/generated/prisma', () => ({
  PrismaClient: vi.fn(),
  AccountType: {
    CHECKING: 'CHECKING',
    SAVINGS: 'SAVINGS',
    INVESTMENT: 'INVESTMENT',
  },
}));

describe('AccountSelectionService', () => {
  let service: AccountSelectionService;
  let mockPrisma: any;

  beforeEach(() => {
    // Create mock Prisma instance
    mockPrisma = {
      bankAccount: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      oFXAccountMapping: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      $disconnect: vi.fn(),
    };

    // Mock PrismaClient constructor
    (PrismaClient as any).mockImplementation(() => mockPrisma);

    service = new AccountSelectionService(mockPrisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllBankAccounts', () => {
    it('should retrieve all bank accounts ordered correctly', async () => {
      const mockAccounts = [
        {
          id: '1',
          name: 'CC - Sicredi',
          bankName: 'Sicredi',
          accountType: AccountType.CHECKING,
          isActive: true,
          _count: { transactions: 10, ofxAccountMappings: 1 },
        },
        {
          id: '2',
          name: 'CC - PJBank',
          bankName: 'PJBank',
          accountType: AccountType.CHECKING,
          isActive: false,
          _count: { transactions: 5, ofxAccountMappings: 0 },
        },
      ];

      mockPrisma.bankAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.getAllBankAccounts();

      expect(mockPrisma.bankAccount.findMany).toHaveBeenCalledWith({
        orderBy: [{ isActive: 'desc' }, { bankName: 'asc' }, { name: 'asc' }],
        include: {
          _count: {
            select: {
              transactions: true,
              ofxAccountMappings: true,
            },
          },
        },
      });

      expect(result).toEqual(mockAccounts);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.bankAccount.findMany.mockRejectedValue(
        new Error('Database error')
      );

      await expect(service.getAllBankAccounts()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('validateAccountSelection', () => {
    it('should validate existing active account successfully', async () => {
      const mockAccount = {
        id: '1',
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
        isActive: true,
        _count: { transactions: 10, ofxAccountMappings: 1 },
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.validateAccountSelection('1');

      expect(result.isValid).toBe(true);
      expect(result.account).toEqual(mockAccount);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid account ID', async () => {
      const result = await service.validateAccountSelection('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ID da conta bancária é obrigatório');
    });

    it('should reject non-string account ID', async () => {
      const result = await service.validateAccountSelection(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('ID da conta bancária é obrigatório');
    });

    it('should reject non-existent account', async () => {
      mockPrisma.bankAccount.findUnique.mockResolvedValue(null);

      const result = await service.validateAccountSelection('nonexistent');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Conta bancária não encontrada');
    });

    it('should reject inactive account', async () => {
      const mockAccount = {
        id: '1',
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
        isActive: false,
        _count: { transactions: 10, ofxAccountMappings: 1 },
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.validateAccountSelection('1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Conta bancária está inativa');
    });

    it('should handle database errors', async () => {
      mockPrisma.bankAccount.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.validateAccountSelection('1');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Erro ao validar conta bancária');
    });
  });

  describe('createNewBankAccount', () => {
    it('should create new bank account successfully', async () => {
      const accountData = {
        name: 'CC - Novo Banco',
        bankName: 'Novo Banco',
        accountType: AccountType.CHECKING,
      };

      const mockCreatedAccount = {
        id: '1',
        ...accountData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(null); // No existing account
      mockPrisma.bankAccount.create.mockResolvedValue(mockCreatedAccount);

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(true);
      expect(result.account).toEqual(mockCreatedAccount);
      expect(mockPrisma.bankAccount.create).toHaveBeenCalledWith({
        data: {
          name: accountData.name,
          bankName: accountData.bankName,
          accountType: accountData.accountType,
          isActive: true,
        },
      });
    });

    it('should create account with custom isActive value', async () => {
      const accountData = {
        name: 'CC - Novo Banco',
        bankName: 'Novo Banco',
        accountType: AccountType.CHECKING,
        isActive: false,
      };

      const mockCreatedAccount = {
        id: '1',
        ...accountData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(null);
      mockPrisma.bankAccount.create.mockResolvedValue(mockCreatedAccount);

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(true);
      expect(mockPrisma.bankAccount.create).toHaveBeenCalledWith({
        data: {
          name: accountData.name,
          bankName: accountData.bankName,
          accountType: accountData.accountType,
          isActive: false,
        },
      });
    });

    it('should reject missing required fields', async () => {
      const accountData = {
        name: '',
        bankName: 'Novo Banco',
        accountType: AccountType.CHECKING,
      };

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Nome, banco e tipo da conta são obrigatórios');
    });

    it('should reject duplicate account name', async () => {
      const accountData = {
        name: 'CC - Existing',
        bankName: 'Existing Bank',
        accountType: AccountType.CHECKING,
      };

      const existingAccount = {
        id: '1',
        name: 'CC - Existing',
        bankName: 'Existing Bank',
        accountType: AccountType.CHECKING,
        isActive: true,
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(existingAccount);

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Já existe uma conta com esse nome');
    });

    it('should handle database errors', async () => {
      const accountData = {
        name: 'CC - Novo Banco',
        bankName: 'Novo Banco',
        accountType: AccountType.CHECKING,
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(null);
      mockPrisma.bankAccount.create.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.createNewBankAccount(accountData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro ao criar nova conta bancária');
    });
  });

  describe('persistAccountSelection', () => {
    it('should create new OFX account mapping successfully', async () => {
      const bankAccountId = '1';
      const ofxAccountId = 'OFX123';
      const ofxBankId = 'BANK456';

      const mockAccount = {
        id: '1',
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
        isActive: true,
      };

      // Mock validation success
      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockAccount);
      // Mock no existing mapping
      mockPrisma.oFXAccountMapping.findUnique.mockResolvedValue(null);
      // Mock successful creation
      mockPrisma.oFXAccountMapping.create.mockResolvedValue({
        id: '1',
        ofxAccountId,
        ofxBankId,
        bankAccountId,
      });

      const result = await service.persistAccountSelection(
        bankAccountId,
        ofxAccountId,
        ofxBankId
      );

      expect(result.success).toBe(true);
      expect(result.account).toEqual(mockAccount);
      expect(mockPrisma.oFXAccountMapping.create).toHaveBeenCalledWith({
        data: {
          ofxAccountId,
          ofxBankId,
          bankAccountId,
        },
      });
    });

    it('should update existing OFX account mapping', async () => {
      const bankAccountId = '1';
      const ofxAccountId = 'OFX123';
      const ofxBankId = 'BANK456';

      const mockAccount = {
        id: '1',
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
        isActive: true,
      };

      const existingMapping = {
        id: '1',
        ofxAccountId,
        ofxBankId,
        bankAccountId: '2', // Different bank account
      };

      // Mock validation success
      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockAccount);
      // Mock existing mapping
      mockPrisma.oFXAccountMapping.findUnique.mockResolvedValue(
        existingMapping
      );
      // Mock successful update
      mockPrisma.oFXAccountMapping.update.mockResolvedValue({
        ...existingMapping,
        bankAccountId,
      });

      const result = await service.persistAccountSelection(
        bankAccountId,
        ofxAccountId,
        ofxBankId
      );

      expect(result.success).toBe(true);
      expect(result.account).toEqual(mockAccount);
      expect(mockPrisma.oFXAccountMapping.update).toHaveBeenCalledWith({
        where: { id: existingMapping.id },
        data: {
          bankAccountId,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should handle missing OFX account ID', async () => {
      const result = await service.persistAccountSelection('1', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ID da conta OFX é obrigatório');
    });

    it('should handle invalid bank account', async () => {
      mockPrisma.bankAccount.findUnique.mockResolvedValue(null);

      const result = await service.persistAccountSelection('invalid', 'OFX123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Conta bancária não encontrada');
    });

    it('should handle database errors', async () => {
      const mockAccount = {
        id: '1',
        name: 'CC - Sicredi',
        bankName: 'Sicredi',
        accountType: AccountType.CHECKING,
        isActive: true,
      };

      mockPrisma.bankAccount.findUnique.mockResolvedValue(mockAccount);
      mockPrisma.oFXAccountMapping.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.persistAccountSelection('1', 'OFX123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Erro ao persistir seleção de conta');
    });
  });

  describe('getExistingAccountMapping', () => {
    it('should return existing account mapping', async () => {
      const ofxAccountId = 'OFX123';
      const ofxBankId = 'BANK456';

      const mockMapping = {
        id: '1',
        ofxAccountId,
        ofxBankId,
        bankAccountId: '1',
        bankAccount: {
          id: '1',
          name: 'CC - Sicredi',
          bankName: 'Sicredi',
          accountType: AccountType.CHECKING,
          isActive: true,
        },
      };

      mockPrisma.oFXAccountMapping.findUnique.mockResolvedValue(mockMapping);

      const result = await service.getExistingAccountMapping(
        ofxAccountId,
        ofxBankId
      );

      expect(result).toEqual(mockMapping.bankAccount);
      expect(mockPrisma.oFXAccountMapping.findUnique).toHaveBeenCalledWith({
        where: {
          ofxAccountId_ofxBankId: {
            ofxAccountId,
            ofxBankId,
          },
        },
        include: {
          bankAccount: true,
        },
      });
    });

    it('should return null for non-existent mapping', async () => {
      mockPrisma.oFXAccountMapping.findUnique.mockResolvedValue(null);

      const result = await service.getExistingAccountMapping(
        'OFX123',
        'BANK456'
      );

      expect(result).toBeNull();
    });

    it('should handle missing ofxBankId', async () => {
      const ofxAccountId = 'OFX123';

      mockPrisma.oFXAccountMapping.findUnique.mockResolvedValue(null);

      await service.getExistingAccountMapping(ofxAccountId);

      expect(mockPrisma.oFXAccountMapping.findUnique).toHaveBeenCalledWith({
        where: {
          ofxAccountId_ofxBankId: {
            ofxAccountId,
            ofxBankId: '',
          },
        },
        include: {
          bankAccount: true,
        },
      });
    });
  });

  describe('getAccountMappings', () => {
    it('should return all mappings for a bank account', async () => {
      const bankAccountId = '1';
      const mockMappings = [
        {
          id: '1',
          ofxAccountId: 'OFX123',
          ofxBankId: 'BANK456',
          bankAccountId,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: '2',
          ofxAccountId: 'OFX789',
          ofxBankId: 'BANK456',
          bankAccountId,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.oFXAccountMapping.findMany.mockResolvedValue(mockMappings);

      const result = await service.getAccountMappings(bankAccountId);

      expect(result).toEqual(mockMappings);
      expect(mockPrisma.oFXAccountMapping.findMany).toHaveBeenCalledWith({
        where: { bankAccountId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array for account with no mappings', async () => {
      mockPrisma.oFXAccountMapping.findMany.mockResolvedValue([]);

      const result = await service.getAccountMappings('1');

      expect(result).toEqual([]);
    });
  });
});
