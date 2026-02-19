import { z } from '@hono/zod-openapi'
import { PaginationMetaSchema } from './common'

export const TransactionSchema = z
  .object({
    id: z.string().openapi({ example: 'cm1abc123' }),
    transactionId: z.string().nullable().openapi({ example: 'cm1xyz789' }),
    year: z.number().int().openapi({ example: 2025 }),
    month: z.number().int().openapi({ example: 12 }),
    isReviewed: z.boolean().openapi({ example: true }),
    isTransfer: z.boolean().openapi({ example: false }),
    details: z.string().nullable().openapi({ example: 'Pagamento ref. NF 123' }),
    date: z.string().nullable().openapi({ example: '2025-12-15', description: 'Data da transação original' }),
    description: z
      .string()
      .nullable()
      .openapi({ example: 'PIX RECEBIDO - FULANO DE TAL', description: 'Descrição original do banco' }),
    amount: z.number().nullable().openapi({ example: 1500.0, description: 'Valor (positivo = crédito, negativo = débito)' }),
    balance: z.number().nullable().openapi({ example: 45000.0, description: 'Saldo após transação' }),
    bankAccount: z
      .object({
        id: z.string(),
        name: z.string(),
        bankName: z.string().nullable(),
      })
      .nullable()
      .openapi({ description: 'Conta bancária' }),
    category: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.string(),
        level: z.number().int(),
      })
      .nullable()
      .openapi({ description: 'Categoria' }),
    property: z
      .object({
        id: z.string(),
        code: z.string(),
        description: z.string().nullable(),
        city: z.string().nullable(),
      })
      .nullable()
      .openapi({ description: 'Imóvel vinculado' }),
  })
  .openapi('Transaction')

export const TransactionListQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()).openapi({ example: 2025 }),
  month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1).openapi({ example: 12 }),
  bankAccountId: z.string().optional().openapi({ description: 'Filtrar por conta bancária' }),
  categoryId: z.string().optional().openapi({ description: 'Filtrar por categoria' }),
  hasCategory: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Filtrar por ter categoria (true) ou não-categorizado (false)' }),
  isReviewed: z
    .enum(['true', 'false'])
    .optional()
    .openapi({ description: 'Filtrar por status de revisão' }),
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
  limit: z.coerce.number().int().min(1).max(500).default(50).openapi({ example: 50 }),
})

export const TransactionListResponseSchema = z
  .object({
    data: z.array(TransactionSchema),
    meta: PaginationMetaSchema,
  })
  .openapi('TransactionListResponse')

export const TransactionDetailResponseSchema = z
  .object({
    data: TransactionSchema,
  })
  .openapi('TransactionDetailResponse')

// --- Mutation schemas ---

export const CategorizeInputSchema = z
  .object({
    categoryId: z.string().nullable().optional().openapi({ description: 'ID da categoria (null para remover)' }),
    propertyId: z.string().nullable().optional().openapi({ description: 'ID do imóvel (null para remover)' }),
    markReviewed: z.boolean().optional().openapi({ description: 'Marcar como revisada', example: true }),
  })
  .openapi('CategorizeInput')

export const BulkCategorizeInputSchema = z
  .object({
    ids: z.array(z.string()).min(1).openapi({ description: 'IDs das transações processadas' }),
    categoryId: z.string().nullable().optional().openapi({ description: 'ID da categoria' }),
    propertyId: z.string().nullable().optional().openapi({ description: 'ID do imóvel' }),
    markReviewed: z.boolean().optional().openapi({ description: 'Marcar como revisadas' }),
  })
  .openapi('BulkCategorizeInput')

export const ReviewInputSchema = z
  .object({
    reviewed: z.boolean().openapi({ description: 'Status de revisão', example: true }),
  })
  .openapi('ReviewInput')

export const DetailsInputSchema = z
  .object({
    details: z.string().nullable().openapi({ description: 'Detalhes/notas da transação' }),
  })
  .openapi('DetailsInput')

export const BulkDeleteInputSchema = z
  .object({
    ids: z.array(z.string()).min(1).openapi({ description: 'IDs das transações processadas para deletar' }),
  })
  .openapi('BulkDeleteInput')

export const SuccessResponseSchema = z
  .object({
    success: z.boolean().openapi({ example: true }),
  })
  .openapi('SuccessResponse')

export const BulkDeleteResponseSchema = z
  .object({
    success: z.boolean(),
    deletedCount: z.number().int(),
    message: z.string(),
  })
  .openapi('BulkDeleteResponse')

export const CreateTransactionInputSchema = z
  .object({
    bankAccountId: z.string().openapi({ description: 'ID da conta bancária' }),
    date: z.string().openapi({ example: '2025-12-31', description: 'Data da transação (YYYY-MM-DD)' }),
    description: z.string().openapi({ example: 'Rendimentos SicrediInvest', description: 'Descrição da transação' }),
    amount: z.number().openapi({ example: 150.50, description: 'Valor (positivo = crédito, negativo = débito)' }),
    categoryId: z.string().nullable().optional().openapi({ description: 'ID da categoria (opcional)' }),
    propertyId: z.string().nullable().optional().openapi({ description: 'ID do imóvel (opcional)' }),
    details: z.string().nullable().optional().openapi({ description: 'Notas/detalhes adicionais' }),
  })
  .openapi('CreateTransactionInput')
