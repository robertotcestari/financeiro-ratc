/**
 * Create Transaction Command
 * Creates manual transactions in the financial system
 */

import { prisma } from '@/lib/core/database/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  printError,
  printSuccess,
  printWarning,
  printJson,
  printHeader,
  formatCurrency,
  formatDate,
} from '../utils/output';

export interface CreateTransactionOptions {
  account: string;
  amount: string;
  date: string;
  description: string;
  details?: string;
  category?: string;
  property?: string;
  json?: boolean;
}

/**
 * Find a bank account by name or ID
 */
async function resolveBankAccountId(nameOrId: string): Promise<string | null> {
  // Try to find by exact ID first
  let account = await prisma.bankAccount.findUnique({
    where: { id: nameOrId },
  });

  if (account) return account.id;

  // Try to find by name (case-insensitive contains)
  account = await prisma.bankAccount.findFirst({
    where: {
      name: { contains: nameOrId },
      isActive: true,
    },
  });

  return account?.id ?? null;
}

/**
 * Find a category by name or ID
 */
async function resolveCategoryId(nameOrId: string): Promise<string | null> {
  // Try to find by exact ID first
  let category = await prisma.category.findUnique({
    where: { id: nameOrId },
  });

  if (category) return category.id;

  // Try to find by name (case-insensitive contains)
  category = await prisma.category.findFirst({
    where: { name: { contains: nameOrId } },
  });

  return category?.id ?? null;
}

/**
 * Find a property by code or ID
 */
async function resolvePropertyId(codeOrId: string): Promise<string | null> {
  // Try to find by exact ID first
  let property = await prisma.property.findUnique({
    where: { id: codeOrId },
  });

  if (property) return property.id;

  // Try to find by code (case-insensitive contains)
  property = await prisma.property.findFirst({
    where: { code: { contains: codeOrId } },
  });

  return property?.id ?? null;
}

/**
 * Creates a manual transaction
 */
export async function createTransaction(
  options: CreateTransactionOptions
): Promise<void> {
  try {
    // Validate and resolve bank account
    const bankAccountId = await resolveBankAccountId(options.account);
    if (!bankAccountId) {
      printError(`Conta bancaria nao encontrada: ${options.account}`);
      return;
    }

    // Validate amount
    const amount = parseFloat(options.amount);
    if (isNaN(amount)) {
      printError(`Valor invalido: ${options.amount}`);
      return;
    }

    // Validate date (YYYY-MM-DD format)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(options.date)) {
      printError('Data invalida. Use o formato YYYY-MM-DD (ex: 2024-01-15)');
      return;
    }

    const transactionDate = new Date(options.date);
    if (isNaN(transactionDate.getTime())) {
      printError(`Data invalida: ${options.date}`);
      return;
    }

    // Extract year and month for ProcessedTransaction
    const year = transactionDate.getFullYear();
    const month = transactionDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Resolve optional category
    let categoryId: string | null | undefined;
    if (options.category) {
      categoryId = await resolveCategoryId(options.category);
      if (!categoryId) {
        printError(`Categoria nao encontrada: ${options.category}`);
        return;
      }
    }

    // Resolve optional property
    let propertyId: string | null | undefined;
    if (options.property) {
      propertyId = await resolvePropertyId(options.property);
      if (!propertyId) {
        printError(`Imovel nao encontrado: ${options.property}`);
        return;
      }
    }

    const detailsValue =
      options.details && options.details.trim().length > 0
        ? options.details.trim()
        : null;

    // Create the transaction and processed transaction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create raw Transaction
      const transaction = await tx.transaction.create({
        data: {
          bankAccountId,
          date: transactionDate,
          description: options.description,
          amount: new Decimal(amount),
          balance: null, // Manual transactions don't have a balance snapshot
          ofxTransId: null,
          ofxAccountId: null,
          importBatchId: null,
          isDuplicate: false,
        },
      });

      // Create ProcessedTransaction linked to the Transaction
      const processedTransaction = await tx.processedTransaction.create({
        data: {
          transactionId: transaction.id,
          year,
          month,
          categoryId: categoryId ?? null,
          propertyId: propertyId ?? null,
          details: detailsValue,
          isReviewed: false,
        },
        include: {
          transaction: {
            include: {
              bankAccount: true,
            },
          },
          category: true,
          property: true,
        },
      });

      return processedTransaction;
    });

    // Output result
    if (options.json) {
      printJson({
        success: true,
        transaction: {
          id: result.transaction?.id,
          processedId: result.id,
          bankAccount: result.transaction?.bankAccount.name,
          date: result.transaction?.date,
          description: result.transaction?.description,
          details: result.details ?? null,
          amount: result.transaction?.amount.toString(),
          category: result.category?.name ?? null,
          property: result.property?.code ?? null,
        },
      });
      return;
    }

    printSuccess('Transacao manual criada com sucesso!');
    printHeader('Detalhes da Transacao');
    console.log(`  ID Transacao:       ${result.transaction?.id}`);
    console.log(`  ID Processada:      ${result.id}`);
    console.log(`  Conta:              ${result.transaction?.bankAccount.name}`);
    console.log(`  Data:               ${formatDate(result.transaction?.date ?? new Date())}`);
    console.log(`  Descricao:          ${result.transaction?.description}`);
    if (result.details) {
      console.log(`  Detalhes:           ${result.details}`);
    }
    console.log(`  Valor:              ${formatCurrency(Number(result.transaction?.amount ?? 0))}`);
    console.log(`  Categoria:          ${result.category?.name ?? '(Sem categoria)'}`);
    console.log(`  Imovel:             ${result.property?.code ?? '(Sem imovel)'}`);

    if (!result.category) {
      printWarning('\nAtencao: Transacao criada sem categoria');
    }
  } catch (error) {
    if (options.json) {
      printJson({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      return;
    }

    printError(`Erro ao criar transacao: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}
