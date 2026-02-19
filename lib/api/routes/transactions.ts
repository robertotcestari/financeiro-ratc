import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import {
  TransactionListQuerySchema,
  TransactionListResponseSchema,
  TransactionDetailResponseSchema,
  TransactionSchema,
  CategorizeInputSchema,
  BulkCategorizeInputSchema,
  ReviewInputSchema,
  DetailsInputSchema,
  BulkDeleteInputSchema,
  SuccessResponseSchema,
  BulkDeleteResponseSchema,
  CreateTransactionInputSchema,
} from '../schemas/transactions'
import { ErrorSchema } from '../schemas/common'
import { getProcessedTransactionsByPeriod } from '@/lib/core/database/transactions'
import { categorizeTransaction, bulkCategorizeTransactions } from '@/lib/core/database/categorization'
import { prisma } from '@/lib/core/database/client'
import { Decimal } from '@prisma/client/runtime/library'

const app = new OpenAPIHono()

// GET /transactions
const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Transações'],
  summary: 'Listar transações',
  description: 'Retorna transações processadas com filtros de período, conta, categoria e paginação.',
  security: [{ Bearer: [] }],
  request: {
    query: TransactionListQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: TransactionListResponseSchema } },
      description: 'Lista de transações',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(listRoute, async (c) => {
  const { year, month, bankAccountId, categoryId, hasCategory, isReviewed, page, limit } =
    c.req.valid('query')

  const allTransactions = await getProcessedTransactionsByPeriod(year, month)

  // Apply filters
  let filtered = allTransactions

  if (bankAccountId) {
    filtered = filtered.filter((t) => t.transaction?.bankAccountId === bankAccountId)
  }
  if (categoryId) {
    filtered = filtered.filter((t) => t.categoryId === categoryId)
  }
  if (hasCategory !== undefined) {
    const hasCat = hasCategory === 'true'
    filtered = filtered.filter((t) => hasCat ? t.categoryId !== null : t.categoryId === null)
  }
  if (isReviewed !== undefined) {
    const reviewedBool = isReviewed === 'true'
    filtered = filtered.filter((t) => t.isReviewed === reviewedBool)
  }

  const total = filtered.length
  const offset = (page - 1) * limit
  const paginated = filtered.slice(offset, offset + limit)

  const data = paginated.map(serializeTransaction)

  return c.json({ data, meta: { page, limit, total } }, 200)
})

// POST /transactions (create manual transaction)
const createTxRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Transações'],
  summary: 'Criar transação manual',
  description: 'Cria uma transação manualmente (ex: rendimentos de investimento, ajustes). Cria tanto o registro raw (Transaction) quanto o processado (ProcessedTransaction).',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateTransactionInputSchema } } },
  },
  responses: {
    201: { content: { 'application/json': { schema: TransactionDetailResponseSchema } }, description: 'Transação criada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro de validação' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(createTxRoute, async (c) => {
  const { bankAccountId, date, description, amount, categoryId, propertyId, details } = c.req.valid('json')

  try {
    const txDate = new Date(date)
    if (isNaN(txDate.getTime())) {
      return c.json({ error: 'Data inválida. Use formato YYYY-MM-DD.', status: 400 }, 400)
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create raw transaction
      const rawTx = await tx.transaction.create({
        data: {
          bankAccountId,
          date: txDate,
          description,
          amount: new Decimal(amount),
          ofxTransId: `manual_${Date.now()}`,
          ofxAccountId: 'MANUAL',
        },
      })

      // Build ProcessedTransaction data
      const ptData: {
        transactionId: string
        year: number
        month: number
        details?: string | null
        categoryId?: string | null
        propertyId?: string | null
      } = {
        transactionId: rawTx.id,
        year: txDate.getFullYear(),
        month: txDate.getMonth() + 1,
      }

      if (details !== undefined) ptData.details = details
      if (categoryId !== undefined) ptData.categoryId = categoryId
      if (propertyId !== undefined) ptData.propertyId = propertyId

      const processedTx = await tx.processedTransaction.create({
        data: ptData,
        include: {
          transaction: { include: { bankAccount: true } },
          category: true,
          property: true,
        },
      })

      return processedTx
    })

    return c.json({ data: serializeTransaction(result) }, 201)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao criar transação', status: 400 }, 400)
  }
})

// GET /transactions/:id
const detailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Transações'],
  summary: 'Detalhe de uma transação',
  description: 'Retorna os detalhes de uma transação processada com todas as relações.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: 'cm1abc123', description: 'ID da transação processada' }),
    }),
  },
  responses: {
    200: {
      content: { 'application/json': { schema: TransactionDetailResponseSchema } },
      description: 'Detalhe da transação',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Transação não encontrada',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(detailRoute, async (c) => {
  const { id } = c.req.valid('param')

  const transaction = await prisma.processedTransaction.findUnique({
    where: { id },
    include: {
      transaction: { include: { bankAccount: true } },
      category: true,
      property: true,
    },
  })

  if (!transaction) {
    return c.json({ error: 'Transação não encontrada', status: 404 }, 404)
  }

  return c.json({ data: serializeTransaction(transaction) }, 200)
})

// PUT /transactions/:id/categorize
const categorizeRoute = createRoute({
  method: 'put',
  path: '/{id}/categorize',
  tags: ['Transações'],
  summary: 'Categorizar uma transação',
  description: 'Atualiza categoria e/ou imóvel de uma transação processada. Envie null para remover.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'ID da transação processada' }) }),
    body: { content: { 'application/json': { schema: CategorizeInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: TransactionDetailResponseSchema } }, description: 'Transação categorizada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não encontrada' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(categorizeRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { categoryId, propertyId, markReviewed } = c.req.valid('json')

  try {
    await categorizeTransaction(id, categoryId, propertyId)

    if (markReviewed) {
      await prisma.processedTransaction.update({ where: { id }, data: { isReviewed: true } })
    }

    const updated = await prisma.processedTransaction.findUnique({
      where: { id },
      include: { transaction: { include: { bankAccount: true } }, category: true, property: true },
    })

    if (!updated) return c.json({ error: 'Transação não encontrada', status: 404 }, 404)
    return c.json({ data: serializeTransaction(updated) }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao categorizar', status: 400 }, 400)
  }
})

// POST /transactions/bulk-categorize
const bulkCategorizeRoute = createRoute({
  method: 'post',
  path: '/bulk-categorize',
  tags: ['Transações'],
  summary: 'Categorizar em lote',
  description: 'Aplica mesma categoria e/ou imóvel a múltiplas transações.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: BulkCategorizeInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Categorização aplicada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(bulkCategorizeRoute, async (c) => {
  const { ids, categoryId, propertyId, markReviewed } = c.req.valid('json')

  try {
    await bulkCategorizeTransactions(ids, categoryId, propertyId)
    if (markReviewed) {
      await prisma.processedTransaction.updateMany({ where: { id: { in: ids } }, data: { isReviewed: true } })
    }
    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro na categorização em lote', status: 400 }, 400)
  }
})

// PUT /transactions/:id/review
const reviewRoute = createRoute({
  method: 'put',
  path: '/{id}/review',
  tags: ['Transações'],
  summary: 'Marcar como revisada',
  description: 'Alterna o status de revisão de uma transação.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: ReviewInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Status atualizado' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(reviewRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { reviewed } = c.req.valid('json')
  try {
    await prisma.processedTransaction.update({ where: { id }, data: { isReviewed: reviewed } })
    return c.json({ success: true }, 200)
  } catch {
    return c.json({ error: 'Transação não encontrada', status: 400 }, 400)
  }
})

// PUT /transactions/:id/details
const detailsRoute = createRoute({
  method: 'put',
  path: '/{id}/details',
  tags: ['Transações'],
  summary: 'Atualizar detalhes',
  description: 'Atualiza o campo de detalhes/notas de uma transação.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: DetailsInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Detalhes atualizados' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(detailsRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { details } = c.req.valid('json')
  try {
    await prisma.processedTransaction.update({
      where: { id },
      data: { details: details && details.trim().length > 0 ? details.trim() : null },
    })
    return c.json({ success: true }, 200)
  } catch {
    return c.json({ error: 'Transação não encontrada', status: 400 }, 400)
  }
})

// POST /transactions/bulk-delete
const bulkDeleteRoute = createRoute({
  method: 'post',
  path: '/bulk-delete',
  tags: ['Transações'],
  summary: 'Deletar em lote',
  description: 'Deleta múltiplas transações processadas (cascade deleta sugestões associadas).',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: BulkDeleteInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: BulkDeleteResponseSchema } }, description: 'Transações deletadas' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(bulkDeleteRoute, async (c) => {
  const { ids } = c.req.valid('json')
  const result = await prisma.processedTransaction.deleteMany({ where: { id: { in: ids } } })
  return c.json({ success: true, deletedCount: result.count, message: `${result.count} transações deletadas` }, 200)
})

function serializeTransaction(t: {
  id: string
  transactionId: string | null
  year: number
  month: number
  isReviewed: boolean
  isTransfer?: boolean
  details: string | null
  transaction?: {
    date: Date
    description: string
    amount: unknown
    balance: unknown
    bankAccount: { id: string; name: string; bankName: string | null }
  } | null
  category?: { id: string; name: string; type: string; level: number } | null
  property?: { id: string; code: string; description: string | null; city: string | null } | null
}) {
  return {
    id: t.id,
    transactionId: t.transactionId,
    year: t.year,
    month: t.month,
    isReviewed: t.isReviewed,
    isTransfer: t.isTransfer ?? false,
    details: t.details,
    date: t.transaction?.date ? t.transaction.date.toISOString().split('T')[0] : null,
    description: t.transaction?.description ?? null,
    amount: t.transaction?.amount != null ? Number(t.transaction.amount) : null,
    balance: t.transaction?.balance != null ? Number(t.transaction.balance) : null,
    bankAccount: t.transaction?.bankAccount
      ? {
          id: t.transaction.bankAccount.id,
          name: t.transaction.bankAccount.name,
          bankName: t.transaction.bankAccount.bankName,
        }
      : null,
    category: t.category
      ? { id: t.category.id, name: t.category.name, type: t.category.type, level: t.category.level }
      : null,
    property: t.property
      ? {
          id: t.property.id,
          code: t.property.code,
          description: t.property.description,
          city: t.property.city,
        }
      : null,
  }
}

export default app
