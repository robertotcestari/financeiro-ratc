import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { ErrorSchema } from '../schemas/common'
import { SuccessResponseSchema } from '../schemas/transactions'
import {
  CancelPayableInputSchema,
  CreatePayableInputSchema,
  PayableDetailResponseSchema,
  PayableListQuerySchema,
  PayableListResponseSchema,
  RecurrenceGenerateInputSchema,
  ReverseSettlementInputSchema,
  SettleInstallmentInputSchema,
  UpdatePayableInputSchema,
} from '../schemas/payables'
import {
  cancelPayable,
  createPayable,
  getPayableById,
  listAgendaInstallments,
  listInstallments,
  serializePayable,
  updatePayable,
} from '@/lib/core/database/payables'
import {
  reverseSettlement,
  settleInstallment,
} from '@/lib/core/database/payable-settlements'
import { generateRecurrenceForPeriod } from '@/lib/core/database/payable-recurrences'
import { PayableError } from '@/lib/core/payables/errors'
import { isoDate } from '@/lib/core/payables/dates'
import type { PayableInstallmentStatus } from '@/app/generated/prisma/client'

const app = new OpenAPIHono()
const idParams = z.object({ id: z.string() })

function mapInstallment(item: Awaited<ReturnType<typeof listInstallments>>[number]) {
  return {
    id: item.id,
    payableId: item.payableId,
    installmentNumber: item.installmentNumber,
    dueDate: isoDate(new Date(item.dueDate)),
    amount: item.amount,
    paidAmount: item.paidAmount,
    remainingAmount: item.remainingAmount,
    paymentMethod: item.paymentMethod,
    status: item.status,
    isOverdue: item.isOverdue,
    isDueToday: item.isDueToday,
    description: item.payable.description,
    vendorName: item.payable.vendor.name,
    propertyCode: item.payable.property?.code ?? null,
  }
}

function handleError(error: unknown) {
  if (error instanceof PayableError) {
    return { error: error.message, status: 400 as const };
  }
  return { error: 'Erro inesperado', status: 400 as const };
}

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Contas a Pagar'],
    summary: 'Listar parcelas',
    security: [{ Bearer: [] }],
    request: { query: PayableListQuerySchema },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableListResponseSchema } },
        description: 'Lista de parcelas',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    const query = c.req.valid('query')
    let dueFrom = query.dueFrom
    let dueTo = query.dueTo
    if (query.year && query.month && !dueFrom && !dueTo) {
      dueFrom = `${query.year}-${String(query.month).padStart(2, '0')}-01`
      const last = new Date(Date.UTC(query.year, query.month, 0)).getUTCDate()
      dueTo = `${query.year}-${String(query.month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
    }

    const items = await listInstallments({
      status: query.status as PayableInstallmentStatus | undefined,
      vendorId: query.vendorId,
      propertyId: query.propertyId,
      categoryId: query.categoryId,
      dueFrom,
      dueTo,
      overdue: query.overdue === 'true' ? true : query.overdue === 'false' ? false : undefined,
      hideCanceled: query.status !== 'CANCELED',
    })
    return c.json({ data: items.map(mapInstallment) }, 200)
  }
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/agenda',
    tags: ['Contas a Pagar'],
    summary: 'Agenda de parcelas em aberto',
    security: [{ Bearer: [] }],
    request: {
      query: z.object({
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableListResponseSchema } },
        description: 'Agenda',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    const { from, to } = c.req.valid('query')
    const items = await listAgendaInstallments(new Date(from), new Date(to))
    return c.json({ data: items.map(mapInstallment) }, 200)
  }
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Contas a Pagar'],
    summary: 'Criar título',
    security: [{ Bearer: [] }],
    request: {
      body: { content: { 'application/json': { schema: CreatePayableInputSchema } } },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Título criado',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro de validação',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const payable = await createPayable(c.req.valid('json'))
      return c.json({ data: serializePayable(payable) }, 201)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Contas a Pagar'],
    summary: 'Detalhar título',
    security: [{ Bearer: [] }],
    request: { params: idParams },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Título',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não encontrado',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    const payable = await getPayableById(c.req.valid('param').id)
    if (!payable) {
      return c.json({ error: 'Título não encontrado', status: 404 }, 404)
    }
    return c.json({ data: serializePayable(payable) }, 200)
  }
)

app.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Contas a Pagar'],
    summary: 'Atualizar título',
    security: [{ Bearer: [] }],
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: UpdatePayableInputSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Título atualizado',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro de validação',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não encontrado',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const payable = await updatePayable(c.req.valid('param').id, c.req.valid('json'))
      return c.json({ data: serializePayable(payable) }, 200)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/cancel',
    tags: ['Contas a Pagar'],
    summary: 'Cancelar título',
    security: [{ Bearer: [] }],
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: CancelPayableInputSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Título cancelado',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro ao cancelar',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não encontrado',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const payable = await cancelPayable(
        c.req.valid('param').id,
        c.req.valid('json').reason
      )
      return c.json({ data: serializePayable(payable) }, 200)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/recurrences/{id}/generate',
    tags: ['Contas a Pagar'],
    summary: 'Gerar competência de recorrência',
    security: [{ Bearer: [] }],
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: RecurrenceGenerateInputSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: SuccessResponseSchema } },
        description: 'Geração concluída',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro ao gerar',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const { year, month } = c.req.valid('json')
      await generateRecurrenceForPeriod(c.req.valid('param').id, year, month)
      return c.json({ success: true }, 200)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

export const installmentSettlementsApp = new OpenAPIHono()

installmentSettlementsApp.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/settlements',
    tags: ['Contas a Pagar'],
    summary: 'Baixar parcela',
    security: [{ Bearer: [] }],
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: SettleInstallmentInputSchema } } },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Baixa registrada',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro ao baixar',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const result = await settleInstallment({
        installmentId: c.req.valid('param').id,
        ...c.req.valid('json'),
      })
      return c.json({ data: result.payable ? serializePayable(result.payable) : result }, 201)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

export const settlementReverseApp = new OpenAPIHono()

settlementReverseApp.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/reverse',
    tags: ['Contas a Pagar'],
    summary: 'Estornar baixa',
    security: [{ Bearer: [] }],
    request: {
      params: idParams,
      body: { content: { 'application/json': { schema: ReverseSettlementInputSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: PayableDetailResponseSchema } },
        description: 'Baixa estornada',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Erro ao estornar',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    try {
      const payable = await reverseSettlement(c.req.valid('param').id, {
        reason: c.req.valid('json').reason,
      })
      return c.json({ data: payable ? serializePayable(payable) : payable }, 200)
    } catch (error) {
      const mapped = handleError(error)
      return c.json({ error: mapped.error, status: mapped.status }, mapped.status)
    }
  }
)

export default app
