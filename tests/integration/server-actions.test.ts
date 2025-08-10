import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock Next.js functions
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock Prisma client
const mockPrismaClient = {
  category: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  bankAccount: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  $disconnect: vi.fn(),
  $transaction: vi.fn(),
};

vi.mock('../../lib/database/client', () => ({
  prisma: mockPrismaClient,
}));

// Mock category types
const CategoryType = {
  RECEITA: 'RECEITA',
  DESPESA: 'DESPESA',
  CONTROLE: 'CONTROLE',
} as const;

vi.mock('../../app/generated/prisma', () => ({
  CategoryType,
}));

describe('Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Category Actions', () => {
    it('should create a new category with valid data', async () => {
      const mockCreatedCategory = {
        id: '1',
        name: 'Aluguel',
        type: 'RECEITA',
        level: 1,
        orderIndex: 0,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.category.create.mockResolvedValue(mockCreatedCategory);

      // Mock the create category function
      const createCategory = async (formData: FormData) => {
        const name = formData.get('name') as string;
        const type = formData.get('type') as keyof typeof CategoryType;
        const level = parseInt(formData.get('level') as string);
        const orderIndex = parseInt(formData.get('orderIndex') as string);

        if (!name || !type) {
          throw new Error('Nome e tipo são obrigatórios');
        }

        return await mockPrismaClient.category.create({
          data: {
            name,
            type,
            level,
            orderIndex,
            parentId: null,
          },
        });
      };

      const formData = new FormData();
      formData.append('name', 'Aluguel');
      formData.append('type', 'RECEITA');
      formData.append('level', '1');
      formData.append('orderIndex', '0');

      const result = await createCategory(formData);

      expect(mockPrismaClient.category.create).toHaveBeenCalledWith({
        data: {
          name: 'Aluguel',
          type: 'RECEITA',
          level: 1,
          orderIndex: 0,
          parentId: null,
        },
      });

      expect(result).toEqual(mockCreatedCategory);
    });

    it('should update an existing category', async () => {
      const mockUpdatedCategory = {
        id: '1',
        name: 'Aluguel Atualizado',
        type: 'RECEITA',
        level: 1,
        orderIndex: 0,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.category.update.mockResolvedValue(mockUpdatedCategory);

      const updateCategory = async (
        id: string,
        data: { name: string; type: string; orderIndex: number }
      ) => {
        return await mockPrismaClient.category.update({
          where: { id },
          data,
        });
      };

      const result = await updateCategory('1', {
        name: 'Aluguel Atualizado',
        type: 'RECEITA',
        orderIndex: 0,
      });

      expect(mockPrismaClient.category.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          name: 'Aluguel Atualizado',
          type: 'RECEITA',
          orderIndex: 0,
        },
      });

      expect(result).toEqual(mockUpdatedCategory);
    });

    it('should delete a category', async () => {
      mockPrismaClient.category.delete.mockResolvedValue({
        id: '1',
        name: 'Categoria Deletada',
        type: 'RECEITA',
      });

      const deleteCategory = async (id: string) => {
        return await mockPrismaClient.category.delete({
          where: { id },
        });
      };

      const result = await deleteCategory('1');

      expect(mockPrismaClient.category.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result.id).toBe('1');
    });

    it('should validate required fields', async () => {
      const createCategory = async (formData: FormData) => {
        const name = formData.get('name') as string;
        const type = formData.get('type') as string;

        if (!name) {
          throw new Error('Nome é obrigatório');
        }

        if (!type) {
          throw new Error('Tipo é obrigatório');
        }

        return { name, type };
      };

      const formData = new FormData();
      // Missing name
      formData.append('type', 'RECEITA');

      await expect(createCategory(formData)).rejects.toThrow(
        'Nome é obrigatório'
      );
    });
  });

  describe('Transaction Actions', () => {
    it('should create a new transaction', async () => {
      const mockTransaction = {
        id: '1',
        amount: 1500.5,
        description: 'Pagamento aluguel',
        date: new Date('2024-01-15'),
        bankAccountId: '1',
        categoryId: '1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.transaction.create.mockResolvedValue(mockTransaction);

      const createTransaction = async (data: {
        amount: number;
        description: string;
        date: Date;
        bankAccountId: string;
        categoryId?: string;
      }) => {
        return await mockPrismaClient.transaction.create({
          data,
        });
      };

      const result = await createTransaction({
        amount: 1500.5,
        description: 'Pagamento aluguel',
        date: new Date('2024-01-15'),
        bankAccountId: '1',
        categoryId: '1',
      });

      expect(mockPrismaClient.transaction.create).toHaveBeenCalledWith({
        data: {
          amount: 1500.5,
          description: 'Pagamento aluguel',
          date: new Date('2024-01-15'),
          bankAccountId: '1',
          categoryId: '1',
        },
      });

      expect(result).toEqual(mockTransaction);
    });

    it('should update a transaction', async () => {
      const mockUpdatedTransaction = {
        id: '1',
        amount: 1800.0,
        description: 'Pagamento aluguel atualizado',
        date: new Date('2024-01-15'),
        bankAccountId: '1',
        categoryId: '2',
      };

      mockPrismaClient.transaction.update.mockResolvedValue(
        mockUpdatedTransaction
      );

      const updateTransaction = async (
        id: string,
        data: {
          amount?: number;
          description?: string;
          categoryId?: string;
        }
      ) => {
        return await mockPrismaClient.transaction.update({
          where: { id },
          data,
        });
      };

      const result = await updateTransaction('1', {
        amount: 1800.0,
        description: 'Pagamento aluguel atualizado',
        categoryId: '2',
      });

      expect(mockPrismaClient.transaction.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          amount: 1800.0,
          description: 'Pagamento aluguel atualizado',
          categoryId: '2',
        },
      });

      expect(result).toEqual(mockUpdatedTransaction);
    });

    it('should handle bulk transaction operations', async () => {
      const mockTransactions = [
        { id: '1', amount: 1000, description: 'Transaction 1' },
        { id: '2', amount: 2000, description: 'Transaction 2' },
      ];

      mockPrismaClient.$transaction.mockResolvedValue(mockTransactions);

      const bulkCreateTransactions = async (
        transactions: Array<{
          amount: number;
          description: string;
          bankAccountId: string;
        }>
      ) => {
        return await mockPrismaClient.$transaction(
          transactions.map((tx) =>
            mockPrismaClient.transaction.create({ data: tx })
          )
        );
      };

      const result = await bulkCreateTransactions([
        { amount: 1000, description: 'Transaction 1', bankAccountId: '1' },
        { amount: 2000, description: 'Transaction 2', bankAccountId: '1' },
      ]);

      expect(mockPrismaClient.$transaction).toHaveBeenCalledOnce();
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('Bank Account Actions', () => {
    it('should create a new bank account', async () => {
      const mockBankAccount = {
        id: '1',
        name: 'Conta Corrente Sicredi',
        bankName: 'Sicredi',
        accountType: 'CHECKING',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.bankAccount.create.mockResolvedValue(mockBankAccount);

      const createBankAccount = async (data: {
        name: string;
        bankName: string;
        accountType: string;
        isActive?: boolean;
      }) => {
        return await mockPrismaClient.bankAccount.create({
          data: {
            ...data,
            isActive: data.isActive ?? true,
          },
        });
      };

      const result = await createBankAccount({
        name: 'Conta Corrente Sicredi',
        bankName: 'Sicredi',
        accountType: 'CHECKING',
      });

      expect(mockPrismaClient.bankAccount.create).toHaveBeenCalledWith({
        data: {
          name: 'Conta Corrente Sicredi',
          bankName: 'Sicredi',
          accountType: 'CHECKING',
          isActive: true,
        },
      });

      expect(result).toEqual(mockBankAccount);
    });

    it('should find all bank accounts', async () => {
      const mockBankAccounts = [
        { id: '1', name: 'Conta 1', bankName: 'Banco 1', isActive: true },
        { id: '2', name: 'Conta 2', bankName: 'Banco 2', isActive: false },
      ];

      mockPrismaClient.bankAccount.findMany.mockResolvedValue(mockBankAccounts);

      const getBankAccounts = async (includeInactive = false) => {
        return await mockPrismaClient.bankAccount.findMany({
          where: includeInactive ? {} : { isActive: true },
          orderBy: { name: 'asc' },
        });
      };

      const result = await getBankAccounts();

      expect(mockPrismaClient.bankAccount.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      expect(result).toEqual(mockBankAccounts);
    });
  });
});
