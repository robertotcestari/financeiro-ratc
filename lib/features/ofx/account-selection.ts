import { PrismaClient, BankAccount, AccountType } from '@/app/generated/prisma';
import { prisma as defaultPrisma } from '@/lib/core/database/client';

export interface CreateBankAccountData {
  name: string;
  bankName: string;
  accountType: AccountType;
  isActive?: boolean;
}

export interface AccountSelectionResult {
  success: boolean;
  account?: BankAccount;
  error?: string;
}

export interface AccountValidationResult {
  isValid: boolean;
  account?: BankAccount;
  error?: string;
}

export interface ImportPreviewAccountSelection {
  bankAccountId: string;
  ofxAccountId?: string;
  ofxBankId?: string;
  createdAt: Date;
}

/**
 * Service for handling bank account selection during OFX import process
 */
export class AccountSelectionService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || defaultPrisma;
  }
  /**
   * Retrieve all available bank accounts for user selection
   * Returns active accounts first, ordered by bank name and account name
   */
  async getAllBankAccounts(): Promise<BankAccount[]> {
    try {
      const accounts = await this.prisma.bankAccount.findMany({
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

      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate that a selected bank account exists and is accessible
   * @param bankAccountId - The ID of the bank account to validate
   */
  async validateAccountSelection(
    bankAccountId: string
  ): Promise<AccountValidationResult> {
    try {
      if (!bankAccountId || typeof bankAccountId !== 'string') {
        return {
          isValid: false,
          error: 'ID da conta bancária é obrigatório',
        };
      }

      const account = await this.prisma.bankAccount.findUnique({
        where: { id: bankAccountId },
        include: {
          _count: {
            select: {
              transactions: true,
              ofxAccountMappings: true,
            },
          },
        },
      });

      if (!account) {
        return {
          isValid: false,
          error: 'Conta bancária não encontrada',
        };
      }

      if (!account.isActive) {
        return {
          isValid: false,
          error: 'Conta bancária está inativa',
        };
      }

      return {
        isValid: true,
        account,
      };
    } catch {
      return {
        isValid: false,
        error: 'Erro ao validar conta bancária',
      };
    }
  }

  /**
   * Create a new bank account during the import process
   * @param accountData - Data for creating the new bank account
   */
  async createNewBankAccount(
    accountData: CreateBankAccountData
  ): Promise<AccountSelectionResult> {
    try {
      // Validate required fields
      if (
        !accountData.name ||
        !accountData.bankName ||
        !accountData.accountType
      ) {
        return {
          success: false,
          error: 'Nome, banco e tipo da conta são obrigatórios',
        };
      }

      // Check if account name already exists
      // Try fast unique lookup first; trim name to avoid whitespace dupes
      const trimmedName = accountData.name.trim();
      let existingAccount = await this.prisma.bankAccount.findUnique({
        where: { name: trimmedName },
      });
      if (!existingAccount && trimmedName !== accountData.name) {
        existingAccount = await this.prisma.bankAccount.findFirst({
          where: { name: { equals: trimmedName } },
        });
      }

      if (existingAccount) {
        return {
          success: false,
          error: 'Já existe uma conta com esse nome',
        };
      }

      // Create the new account
      const account = await this.prisma.bankAccount.create({
        data: {
          name: trimmedName,
          bankName: accountData.bankName,
          accountType: accountData.accountType,
          isActive: accountData.isActive ?? true,
        },
      });

      return {
        success: true,
        account,
      };
    } catch {
      return {
        success: false,
        error: 'Erro ao criar nova conta bancária',
      };
    }
  }

  /**
   * Persist account selection for import preview
   * This creates or updates an OFX account mapping for future imports
   * @param bankAccountId - The selected bank account ID
   * @param ofxAccountId - The OFX account ID from the file
   * @param ofxBankId - The OFX bank ID from the file (optional)
   */
  async persistAccountSelection(
    bankAccountId: string,
    ofxAccountId: string,
    ofxBankId?: string
  ): Promise<AccountSelectionResult> {
    try {
      if (!ofxAccountId) {
        return {
          success: false,
          error: 'ID da conta OFX é obrigatório',
        };
      }

      // Validate that the bank account exists
      const validation = await this.validateAccountSelection(bankAccountId);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Check if mapping already exists
      const existingMapping = await this.prisma.oFXAccountMapping.findUnique({
        where: {
          ofxAccountId_ofxBankId: {
            ofxAccountId,
            ofxBankId: ofxBankId || '',
          },
        },
      });

      if (existingMapping) {
        // Update existing mapping
        await this.prisma.oFXAccountMapping.update({
          where: { id: existingMapping.id },
          data: {
            bankAccountId,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new mapping
        await this.prisma.oFXAccountMapping.create({
          data: {
            ofxAccountId,
            ofxBankId,
            bankAccountId,
          },
        });
      }

      return {
        success: true,
        account: validation.account,
      };
    } catch {
      return {
        success: false,
        error: 'Erro ao persistir seleção de conta',
      };
    }
  }

  /**
   * Get existing OFX account mapping for a given OFX account
   * @param ofxAccountId - The OFX account ID
   * @param ofxBankId - The OFX bank ID (optional)
   */
  async getExistingAccountMapping(
    ofxAccountId: string,
    ofxBankId?: string
  ): Promise<BankAccount | null> {
    try {
      const mapping = await this.prisma.oFXAccountMapping.findUnique({
        where: {
          ofxAccountId_ofxBankId: {
            ofxAccountId,
            ofxBankId: ofxBankId || '',
          },
        },
        include: {
          bankAccount: true,
        },
      });

      return mapping?.bankAccount || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all OFX account mappings for a specific bank account
   * @param bankAccountId - The bank account ID
   */
  async getAccountMappings(bankAccountId: string): Promise<{ id: string; ofxAccountId: string; ofxBankId: string | null; bankAccountId: string; createdAt: Date; updatedAt: Date; }[]> {
    try {
      const mappings = await this.prisma.oFXAccountMapping.findMany({
        where: { bankAccountId },
        orderBy: { createdAt: 'desc' },
      });

      return mappings;
    } catch (error) {
      throw error;
    }
  }
}

// Export a singleton instance using the default Prisma client
export const accountSelectionService = new AccountSelectionService();
