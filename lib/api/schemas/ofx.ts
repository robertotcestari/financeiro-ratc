import { z } from '@hono/zod-openapi'

export const OFXParseInputSchema = z
  .object({
    fileContent: z.string().min(1).openapi({ description: 'Conteúdo do arquivo OFX como string' }),
  })
  .openapi('OFXParseInput')

export const OFXTransactionSchema = z
  .object({
    transactionId: z.string(),
    accountId: z.string(),
    date: z.string(),
    amount: z.number(),
    description: z.string(),
    type: z.string(),
    memo: z.string().optional().nullable(),
  })
  .openapi('OFXTransaction')

export const OFXAccountSchema = z
  .object({
    accountId: z.string(),
    bankId: z.string().optional().nullable(),
    accountType: z.string(),
    currency: z.string().optional().nullable(),
  })
  .openapi('OFXAccount')

export const OFXParseResponseSchema = z
  .object({
    success: z.boolean(),
    version: z.string().nullable(),
    format: z.string().nullable(),
    accounts: z.array(OFXAccountSchema),
    transactions: z.array(OFXTransactionSchema),
    errors: z.array(z.object({ message: z.string() })),
  })
  .openapi('OFXParseResponse')

export const OFXPreviewInputSchema = z
  .object({
    fileContent: z.string().min(1).openapi({ description: 'Conteúdo do arquivo OFX' }),
    bankAccountId: z.string().openapi({ description: 'ID da conta bancária destino' }),
  })
  .openapi('OFXPreviewInput')

export const TransactionPreviewSchema = z
  .object({
    transactionId: z.string(),
    date: z.string(),
    amount: z.number(),
    description: z.string(),
    recommendedAction: z.enum(['import', 'skip', 'review']),
    isDuplicate: z.boolean(),
    duplicateConfidence: z.number().optional(),
  })
  .openapi('TransactionPreview')

export const OFXPreviewResponseSchema = z
  .object({
    success: z.boolean(),
    transactions: z.array(TransactionPreviewSchema),
    summary: z.object({
      totalTransactions: z.number().int(),
      validTransactions: z.number().int(),
      invalidTransactions: z.number().int(),
      duplicateTransactions: z.number().int(),
      uniqueTransactions: z.number().int(),
      categorizedTransactions: z.number().int(),
      uncategorizedTransactions: z.number().int(),
    }),
  })
  .openapi('OFXPreviewResponse')

export const OFXImportInputSchema = z
  .object({
    fileContent: z.string().min(1).openapi({ description: 'Conteúdo do arquivo OFX' }),
    bankAccountId: z.string().openapi({ description: 'ID da conta bancária destino' }),
    transactionActions: z
      .record(z.string(), z.enum(['import', 'skip', 'review']))
      .openapi({ description: 'Ação por transação (chave: transactionId OFX)' }),
    transactionCategories: z
      .record(z.string(), z.string().nullable())
      .optional()
      .openapi({ description: 'Categoria por transação (opcional)' }),
    transactionProperties: z
      .record(z.string(), z.string().nullable())
      .optional()
      .openapi({ description: 'Imóvel por transação (opcional)' }),
  })
  .openapi('OFXImportInput')

export const OFXImportResponseSchema = z
  .object({
    success: z.boolean(),
    importBatchId: z.string().nullable(),
    summary: z.object({
      totalTransactions: z.number().int(),
      validTransactions: z.number().int(),
      invalidTransactions: z.number().int(),
      duplicateTransactions: z.number().int(),
      uniqueTransactions: z.number().int(),
      categorizedTransactions: z.number().int(),
      uncategorizedTransactions: z.number().int(),
    }),
    importedCount: z.number().int(),
    skippedCount: z.number().int(),
    failedCount: z.number().int(),
  })
  .openapi('OFXImportResponse')
