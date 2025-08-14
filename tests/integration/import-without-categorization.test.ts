import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImportService } from '@/lib/ofx/import-service';
import { prisma } from '@/lib/database/client';
import type { OFXParseResult } from '@/lib/ofx/types';

// Mock do logger para evitar logs durante testes
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Import Without Categorization', () => {
  let importService: ImportService;
  let testBankAccountId: string;
  let testCategoryId: string;

  beforeEach(async () => {
    importService = new ImportService();

    // Limpar dados de teste anteriores
    await prisma.processedTransaction.deleteMany({
      where: { transaction: { description: { contains: 'TEST_IMPORT_' } } },
    });
    await prisma.transaction.deleteMany({
      where: { description: { contains: 'TEST_IMPORT_' } },
    });
    await prisma.importBatch.deleteMany({
      where: { fileName: { contains: 'test-import' } },
    });

    // Criar conta bancária de teste
    const bankAccount = await prisma.bankAccount.create({
      data: {
        name: 'Test Account for Import',
        bankName: 'Test Bank',
        accountType: 'CHECKING',
        isActive: true,
      },
    });
    testBankAccountId = bankAccount.id;

    // Criar categoria de teste (para verificar que NÃO é usada)
    const category = await prisma.category.create({
      data: {
        name: 'Test Category - Should Not Be Used',
        type: 'EXPENSE',
        level: 1,
        orderIndex: 999,
      },
    });
    testCategoryId = category.id;
  });

  afterEach(async () => {
    // Limpar dados de teste
    await prisma.processedTransaction.deleteMany({
      where: { transaction: { bankAccountId: testBankAccountId } },
    });
    await prisma.transaction.deleteMany({
      where: { bankAccountId: testBankAccountId },
    });
    await prisma.importBatch.deleteMany({
      where: { bankAccountId: testBankAccountId },
    });
    await prisma.bankAccount.delete({
      where: { id: testBankAccountId },
    });
    await prisma.category.delete({
      where: { id: testCategoryId },
    });
  });

  it('should import transactions without any category by default', async () => {
    // Criar um parse result mock
    const parseResult: OFXParseResult = {
      success: true,
      version: '1.x',
      format: 'SGML',
      accounts: [
        {
          accountId: '12345',
          bankId: '001',
          accountType: 'CHECKING',
        },
      ],
      transactions: [
        {
          transactionId: 'TEST001',
          accountId: '12345',
          date: new Date('2025-01-15'),
          amount: -100.0,
          description: 'TEST_IMPORT_EXPENSE',
          type: 'DEBIT',
        },
        {
          transactionId: 'TEST002',
          accountId: '12345',
          date: new Date('2025-01-16'),
          amount: 200.0,
          description: 'TEST_IMPORT_INCOME',
          type: 'CREDIT',
        },
      ],
      errors: [],
    };

    // Gerar preview
    const preview = await importService.previewImportFromParsedResult(
      parseResult,
      testBankAccountId
    );

    expect(preview.success).toBe(true);
    expect(preview.transactions).toHaveLength(2);

    // Executar importação SEM categorias
    const result = await importService.executeImport(preview, {
      bankAccountId: testBankAccountId,
      transactionActions: {
        TEST001: 'import',
        TEST002: 'import',
      },
      // NÃO passar transactionCategories
      importDuplicates: false,
      createProcessedTransactions: true,
    });

    expect(result.success).toBe(true);
    expect(result.transactions.imported).toHaveLength(2);

    // Verificar que as transações foram criadas
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: testBankAccountId },
      include: { processedTransaction: true },
    });

    expect(transactions).toHaveLength(2);

    // Verificar que NENHUMA transação tem categoria
    for (const transaction of transactions) {
      expect(transaction.processedTransaction).toBeDefined();
      expect(transaction.processedTransaction?.categoryId).toBeNull();
      expect(transaction.processedTransaction?.propertyId).toBeNull();
      expect(transaction.processedTransaction?.isReviewed).toBe(false);
    }
  });

  it('should apply user-selected categories when provided', async () => {
    const parseResult: OFXParseResult = {
      success: true,
      version: '1.x',
      format: 'SGML',
      accounts: [
        {
          accountId: '12345',
          bankId: '001',
          accountType: 'CHECKING',
        },
      ],
      transactions: [
        {
          transactionId: 'TEST003',
          accountId: '12345',
          date: new Date('2025-01-17'),
          amount: -50.0,
          description: 'TEST_IMPORT_WITH_CATEGORY',
          type: 'DEBIT',
        },
        {
          transactionId: 'TEST004',
          accountId: '12345',
          date: new Date('2025-01-18'),
          amount: -75.0,
          description: 'TEST_IMPORT_WITHOUT_CATEGORY',
          type: 'DEBIT',
        },
      ],
      errors: [],
    };

    const preview = await importService.previewImportFromParsedResult(
      parseResult,
      testBankAccountId
    );

    // Executar importação com categoria selecionada para apenas uma transação
    const result = await importService.executeImport(preview, {
      bankAccountId: testBankAccountId,
      transactionActions: {
        TEST003: 'import',
        TEST004: 'import',
      },
      transactionCategories: {
        TEST003: testCategoryId, // Apenas esta terá categoria
        // TEST004 não tem entrada, então ficará sem categoria
      },
      importDuplicates: false,
      createProcessedTransactions: true,
    });

    expect(result.success).toBe(true);

    // Verificar as transações processadas
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: testBankAccountId },
      include: { processedTransaction: true },
      orderBy: { description: 'asc' },
    });

    expect(transactions).toHaveLength(2);

    // Primeira transação (TEST003) - COM categoria
    const withCategory = transactions.find(t => t.description.includes('WITH_CATEGORY'));
    expect(withCategory?.processedTransaction?.categoryId).toBe(testCategoryId);
    expect(withCategory?.processedTransaction?.isReviewed).toBe(true);

    // Segunda transação (TEST004) - SEM categoria
    const withoutCategory = transactions.find(t => t.description.includes('WITHOUT_CATEGORY'));
    expect(withoutCategory?.processedTransaction?.categoryId).toBeNull();
    expect(withoutCategory?.processedTransaction?.isReviewed).toBe(false);
  });

  it('should not use auto-categorization suggestions', async () => {
    // Criar uma transação com descrição que normalmente seria auto-categorizada
    const parseResult: OFXParseResult = {
      success: true,
      version: '1.x',
      format: 'SGML',
      accounts: [
        {
          accountId: '12345',
          bankId: '001',
          accountType: 'CHECKING',
        },
      ],
      transactions: [
        {
          transactionId: 'TEST005',
          accountId: '12345',
          date: new Date('2025-01-19'),
          amount: -100.0,
          description: 'TEST_IMPORT_AGUA CONTA DE AGUA', // Contém "AGUA" que poderia ser auto-categorizado
          type: 'DEBIT',
        },
        {
          transactionId: 'TEST006',
          accountId: '12345',
          date: new Date('2025-01-20'),
          amount: 500.0,
          description: 'TEST_IMPORT_ALUGUEL RECEBIDO', // Contém "ALUGUEL" que poderia ser auto-categorizado
          type: 'CREDIT',
        },
      ],
      errors: [],
    };

    const preview = await importService.previewImportFromParsedResult(
      parseResult,
      testBankAccountId
    );

    // O preview pode ter sugestões, mas não devem ser usadas na importação
    expect(preview.transactions).toHaveLength(2);
    
    // As sugestões podem existir no preview (isso é OK)
    // Mas não devem ser aplicadas na importação

    // Executar importação SEM passar categorias
    const result = await importService.executeImport(preview, {
      bankAccountId: testBankAccountId,
      transactionActions: {
        TEST005: 'import',
        TEST006: 'import',
      },
      // NÃO passar transactionCategories - deve ficar sem categoria
      importDuplicates: false,
      createProcessedTransactions: true,
    });

    expect(result.success).toBe(true);

    // Verificar que NENHUMA categoria foi aplicada automaticamente
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: testBankAccountId },
      include: { 
        processedTransaction: {
          include: { category: true }
        }
      },
    });

    expect(transactions).toHaveLength(2);

    for (const transaction of transactions) {
      // Verificar que não há categoria
      expect(transaction.processedTransaction?.categoryId).toBeNull();
      expect(transaction.processedTransaction?.category).toBeNull();
      expect(transaction.processedTransaction?.isReviewed).toBe(false);
      
      // Verificar que não é a categoria "Água" ou qualquer outra
      expect(transaction.processedTransaction?.category?.name).not.toBe('Água');
      expect(transaction.processedTransaction?.category?.name).not.toBe('Aluguel');
    }
  });

  it('should handle mixed import with some categorized and some not', async () => {
    // Criar segunda categoria para teste
    const secondCategory = await prisma.category.create({
      data: {
        name: 'Second Test Category',
        type: 'INCOME',
        level: 1,
        orderIndex: 998,
      },
    });

    const parseResult: OFXParseResult = {
      success: true,
      version: '1.x',
      format: 'SGML',
      accounts: [
        {
          accountId: '12345',
          bankId: '001',
          accountType: 'CHECKING',
        },
      ],
      transactions: [
        {
          transactionId: 'TEST007',
          accountId: '12345',
          date: new Date('2025-01-21'),
          amount: -30.0,
          description: 'TEST_IMPORT_CAT1',
          type: 'DEBIT',
        },
        {
          transactionId: 'TEST008',
          accountId: '12345',
          date: new Date('2025-01-22'),
          amount: -40.0,
          description: 'TEST_IMPORT_NOCAT1',
          type: 'DEBIT',
        },
        {
          transactionId: 'TEST009',
          accountId: '12345',
          date: new Date('2025-01-23'),
          amount: 100.0,
          description: 'TEST_IMPORT_CAT2',
          type: 'CREDIT',
        },
        {
          transactionId: 'TEST010',
          accountId: '12345',
          date: new Date('2025-01-24'),
          amount: -60.0,
          description: 'TEST_IMPORT_NOCAT2',
          type: 'DEBIT',
        },
      ],
      errors: [],
    };

    const preview = await importService.previewImportFromParsedResult(
      parseResult,
      testBankAccountId
    );

    // Importar com categorias selecionadas para apenas algumas transações
    const result = await importService.executeImport(preview, {
      bankAccountId: testBankAccountId,
      transactionActions: {
        TEST007: 'import',
        TEST008: 'import',
        TEST009: 'import',
        TEST010: 'import',
      },
      transactionCategories: {
        TEST007: testCategoryId,
        // TEST008: sem categoria
        TEST009: secondCategory.id,
        // TEST010: sem categoria
      },
      importDuplicates: false,
      createProcessedTransactions: true,
    });

    expect(result.success).toBe(true);
    expect(result.transactions.imported).toHaveLength(4);

    // Verificar cada transação
    const transactions = await prisma.transaction.findMany({
      where: { bankAccountId: testBankAccountId },
      include: { processedTransaction: true },
      orderBy: { description: 'asc' },
    });

    expect(transactions).toHaveLength(4);

    const cat1 = transactions.find(t => t.description.includes('CAT1'));
    const nocat1 = transactions.find(t => t.description.includes('NOCAT1'));
    const cat2 = transactions.find(t => t.description.includes('CAT2'));
    const nocat2 = transactions.find(t => t.description.includes('NOCAT2'));

    // Verificar categorias aplicadas corretamente
    expect(cat1?.processedTransaction?.categoryId).toBe(testCategoryId);
    expect(cat1?.processedTransaction?.isReviewed).toBe(true);

    expect(nocat1?.processedTransaction?.categoryId).toBeNull();
    expect(nocat1?.processedTransaction?.isReviewed).toBe(false);

    expect(cat2?.processedTransaction?.categoryId).toBe(secondCategory.id);
    expect(cat2?.processedTransaction?.isReviewed).toBe(true);

    expect(nocat2?.processedTransaction?.categoryId).toBeNull();
    expect(nocat2?.processedTransaction?.isReviewed).toBe(false);

    // Limpar segunda categoria
    await prisma.category.delete({
      where: { id: secondCategory.id },
    });
  });
});