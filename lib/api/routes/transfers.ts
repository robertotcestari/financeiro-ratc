import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  DetectTransfersInputSchema,
  DetectTransfersResponseSchema,
  ConfirmTransferInputSchema,
} from '../schemas/transfers'
import { ErrorSchema } from '../schemas/common'
import { SuccessResponseSchema } from '../schemas/transactions'
import { findPotentialTransfers } from '@/lib/core/database/transactions'
import { prisma } from '@/lib/core/database/client'

const app = new OpenAPIHono()

// POST /transfers/detect
const detectRoute = createRoute({
  method: 'post',
  path: '/detect',
  tags: ['Transferências'],
  summary: 'Detectar transferências potenciais',
  description: 'Encontra pares de transações que podem ser transferências entre contas (mesmo valor, datas próximas).',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: DetectTransfersInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: DetectTransfersResponseSchema } }, description: 'Transferências detectadas' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(detectRoute, async (c) => {
  const { startDate, endDate } = c.req.valid('json')
  const transfers = await findPotentialTransfers({
    start: new Date(startDate),
    end: new Date(endDate),
  })
  return c.json({ data: transfers as { origin: unknown; destination?: unknown; confidence: number }[] }, 200)
})

// POST /transfers/confirm
const confirmRoute = createRoute({
  method: 'post',
  path: '/confirm',
  tags: ['Transferências'],
  summary: 'Confirmar transferência',
  description: 'Confirma um par de transações como transferência entre contas. Ambas são marcadas com categoria TRANSFER e revisadas.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: ConfirmTransferInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Transferência confirmada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro de validação' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não encontrada' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(confirmRoute, async (c) => {
  const { originTransactionId, destinationTransactionId } = c.req.valid('json')

  try {
    const [originProcessed, destProcessed] = await Promise.all([
      prisma.processedTransaction.findUnique({ where: { id: originTransactionId }, include: { transaction: true } }),
      prisma.processedTransaction.findUnique({ where: { id: destinationTransactionId }, include: { transaction: true } }),
    ])

    if (!originProcessed || !destProcessed) {
      return c.json({ error: 'Transações não encontradas', status: 404 }, 404)
    }

    if (!originProcessed.transaction || !destProcessed.transaction) {
      return c.json({ error: 'Transações sem vínculo com transação bancária', status: 400 }, 400)
    }

    const transferCategory = await prisma.category.findFirst({
      where: { type: 'TRANSFER' as const },
      select: { id: true },
    })

    if (!transferCategory) {
      return c.json({ error: 'Categoria de transferência não encontrada', status: 400 }, 400)
    }

    await prisma.processedTransaction.updateMany({
      where: { id: { in: [originTransactionId, destinationTransactionId] } },
      data: { categoryId: transferCategory.id, isReviewed: true },
    })

    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao confirmar transferência', status: 400 }, 400)
  }
})

export default app
