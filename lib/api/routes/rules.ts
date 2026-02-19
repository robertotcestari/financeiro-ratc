import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import {
  RuleSchema,
  RuleListQuerySchema,
  RuleListResponseSchema,
  RuleDetailResponseSchema,
  CreateRuleInputSchema,
  UpdateRuleInputSchema,
  ToggleRuleInputSchema,
  RuleStatsResponseSchema,
  ApplyRuleInputSchema,
  ApplyRuleResponseSchema,
} from '../schemas/rules'
import { ErrorSchema } from '../schemas/common'
import { SuccessResponseSchema } from '../schemas/transactions'
import { ruleManagementService, type CreateRuleRequest, type UpdateRuleRequest } from '@/lib/core/database/rule-management'
import { ruleEngine } from '@/lib/core/database/rule-engine'

const app = new OpenAPIHono()

function serializeRule(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? null,
    isActive: r.isActive as boolean,
    priority: r.priority as number,
    details: (r.details as string) ?? null,
    criteria: r.criteria ?? {},
    createdAt: r.createdAt instanceof Date ? (r.createdAt as Date).toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? (r.updatedAt as Date).toISOString() : String(r.updatedAt),
    category: r.category
      ? {
          id: (r.category as Record<string, unknown>).id as string,
          name: (r.category as Record<string, unknown>).name as string,
          type: (r.category as Record<string, unknown>).type as string,
        }
      : null,
    property: r.property
      ? {
          id: (r.property as Record<string, unknown>).id as string,
          code: (r.property as Record<string, unknown>).code as string,
        }
      : null,
    suggestionsCount: (r._count as Record<string, number>)?.suggestions ?? 0,
  }
}

// GET /rules
const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Regras de Categorização'],
  summary: 'Listar regras',
  description: 'Retorna regras de categorização com filtros e paginação.',
  security: [{ Bearer: [] }],
  request: { query: RuleListQuerySchema },
  responses: {
    200: { content: { 'application/json': { schema: RuleListResponseSchema } }, description: 'Lista de regras' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(listRoute, async (c) => {
  const { isActive, categoryId, propertyId, search, page, limit } = c.req.valid('query')
  const offset = (page - 1) * limit
  const filters = {
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(categoryId && { categoryId }),
    ...(propertyId && { propertyId }),
    ...(search && { search }),
  }
  const { rules, total } = await ruleManagementService.listRules(filters, limit, offset)
  return c.json({ data: rules.map((r) => serializeRule(r as unknown as Record<string, unknown>)), meta: { page, limit, total } }, 200)
})

// GET /rules/:id
const detailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Regras de Categorização'],
  summary: 'Detalhe de uma regra',
  security: [{ Bearer: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: RuleDetailResponseSchema } }, description: 'Detalhe da regra' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não encontrada' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(detailRoute, async (c) => {
  const { id } = c.req.valid('param')
  const rule = await ruleManagementService.getRule(id)
  if (!rule) return c.json({ error: 'Regra não encontrada', status: 404 }, 404)
  return c.json({ data: serializeRule(rule as unknown as Record<string, unknown>) }, 200)
})

// POST /rules
const createRuleRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Regras de Categorização'],
  summary: 'Criar regra',
  description: 'Cria uma nova regra de categorização automática.',
  security: [{ Bearer: [] }],
  request: { body: { content: { 'application/json': { schema: CreateRuleInputSchema } } } },
  responses: {
    201: { content: { 'application/json': { schema: RuleDetailResponseSchema } }, description: 'Regra criada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro de validação' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(createRuleRoute, async (c) => {
  const input = c.req.valid('json')
  try {
    const rule = await ruleManagementService.createRule(input as unknown as CreateRuleRequest)
    return c.json({ data: serializeRule(rule as unknown as Record<string, unknown>) }, 201)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao criar regra', status: 400 }, 400)
  }
})

// PUT /rules/:id
const updateRuleRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Regras de Categorização'],
  summary: 'Atualizar regra',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: UpdateRuleInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: RuleDetailResponseSchema } }, description: 'Regra atualizada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(updateRuleRoute, async (c) => {
  const { id } = c.req.valid('param')
  const input = c.req.valid('json')
  try {
    const rule = await ruleManagementService.updateRule(id, input as unknown as UpdateRuleRequest)
    return c.json({ data: serializeRule(rule as unknown as Record<string, unknown>) }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao atualizar regra', status: 400 }, 400)
  }
})

// DELETE /rules/:id
const deleteRuleRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Regras de Categorização'],
  summary: 'Deletar regra',
  description: 'Deleta uma regra. Falha se a regra tem sugestões aplicadas.',
  security: [{ Bearer: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Regra deletada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(deleteRuleRoute, async (c) => {
  const { id } = c.req.valid('param')
  try {
    await ruleManagementService.deleteRule(id)
    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao deletar regra', status: 400 }, 400)
  }
})

// PUT /rules/:id/toggle
const toggleRoute = createRoute({
  method: 'put',
  path: '/{id}/toggle',
  tags: ['Regras de Categorização'],
  summary: 'Ativar/desativar regra',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: ToggleRuleInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: RuleDetailResponseSchema } }, description: 'Status alterado' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(toggleRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { isActive } = c.req.valid('json')
  try {
    const rule = await ruleManagementService.toggleRuleStatus(id, isActive)
    return c.json({ data: serializeRule(rule as unknown as Record<string, unknown>) }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao alterar status', status: 400 }, 400)
  }
})

// GET /rules/:id/stats
const statsRoute = createRoute({
  method: 'get',
  path: '/{id}/stats',
  tags: ['Regras de Categorização'],
  summary: 'Estatísticas da regra',
  description: 'Retorna contadores de sugestões geradas, aplicadas, pendentes e taxa de sucesso.',
  security: [{ Bearer: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: { content: { 'application/json': { schema: RuleStatsResponseSchema } }, description: 'Estatísticas' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(statsRoute, async (c) => {
  const { id } = c.req.valid('param')
  const stats = await ruleManagementService.getRuleStats(id)
  return c.json({ data: stats }, 200)
})

// POST /rules/:id/apply
const applyRoute = createRoute({
  method: 'post',
  path: '/{id}/apply',
  tags: ['Regras de Categorização'],
  summary: 'Aplicar regra retroativamente',
  description: 'Aplica uma regra a transações existentes, gerando sugestões para as que correspondem aos critérios.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: ApplyRuleInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: ApplyRuleResponseSchema } }, description: 'Resultado da aplicação' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(applyRoute, async (c) => {
  const { id } = c.req.valid('param')
  const { transactionIds } = c.req.valid('json')
  try {
    const results = await ruleEngine.applyRuleToTransactions(id, transactionIds)
    return c.json({ data: results }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao aplicar regra', status: 400 }, 400)
  }
})

export default app
