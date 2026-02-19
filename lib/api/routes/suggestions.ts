import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import {
  SuggestionListResponseSchema,
  GenerateSuggestionsInputSchema,
  GenerateSuggestionsResponseSchema,
  BulkApplyInputSchema,
  BulkResultSchema,
  BulkDismissInputSchema,
} from '../schemas/suggestions'
import { ErrorSchema } from '../schemas/common'
import { SuccessResponseSchema } from '../schemas/transactions'
import {
  getSuggestionsForTransaction,
  applySuggestion,
  applySuggestions,
  dismissSuggestion,
  dismissSuggestions,
} from '@/lib/core/database/suggestions'
import { ruleEngine } from '@/lib/core/database/rule-engine'

const app = new OpenAPIHono()

// POST /suggestions/generate
const generateRoute = createRoute({
  method: 'post',
  path: '/generate',
  tags: ['Sugestões'],
  summary: 'Gerar sugestões via regras',
  description: 'Executa o motor de regras para gerar sugestões de categorização para as transações especificadas.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: GenerateSuggestionsInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: GenerateSuggestionsResponseSchema } }, description: 'Sugestões geradas' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(generateRoute, async (c) => {
  const { transactionIds, ruleIds } = c.req.valid('json')
  const result = await ruleEngine.generateSuggestions(transactionIds, ruleIds)
  return c.json({ processed: result.processed, suggested: result.suggested, matched: result.matched }, 200)
})

// GET /suggestions/:transactionId
const listRoute = createRoute({
  method: 'get',
  path: '/{transactionId}',
  tags: ['Sugestões'],
  summary: 'Listar sugestões de uma transação',
  description: 'Retorna todas as sugestões ativas para uma transação processada.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ transactionId: z.string().openapi({ description: 'ID da transação processada' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: SuggestionListResponseSchema } }, description: 'Lista de sugestões' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(listRoute, async (c) => {
  const { transactionId } = c.req.valid('param')
  const suggestions = await getSuggestionsForTransaction(transactionId)

  const data = suggestions.map((s) => ({
    id: s.id,
    processedTransactionId: s.processedTransactionId,
    source: s.source,
    confidence: Number(s.confidence),
    isApplied: s.isApplied,
    appliedAt: s.appliedAt?.toISOString() ?? null,
    reasoning: s.reasoning,
    suggestedCategory: s.suggestedCategory,
    suggestedProperty: s.suggestedProperty
      ? { id: s.suggestedProperty.id, code: s.suggestedProperty.code }
      : null,
    suggestedDetails: s.suggestedDetails,
    rule: s.rule ? { id: s.rule.id, name: s.rule.name } : null,
  }))

  return c.json({ data }, 200)
})

// POST /suggestions/:id/apply
const applyRoute = createRoute({
  method: 'post',
  path: '/{id}/apply',
  tags: ['Sugestões'],
  summary: 'Aplicar uma sugestão',
  description: 'Aplica uma sugestão, atualizando a transação com categoria/imóvel sugeridos.',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'ID da sugestão' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Sugestão aplicada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(applyRoute, async (c) => {
  const { id } = c.req.valid('param')
  try {
    await applySuggestion(id)
    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao aplicar sugestão', status: 400 }, 400)
  }
})

// POST /suggestions/bulk-apply
const bulkApplyRoute = createRoute({
  method: 'post',
  path: '/bulk-apply',
  tags: ['Sugestões'],
  summary: 'Aplicar sugestões em lote',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: BulkApplyInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: BulkResultSchema } }, description: 'Resultado da aplicação' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(bulkApplyRoute, async (c) => {
  const { suggestionIds } = c.req.valid('json')
  const results = await applySuggestions(suggestionIds)
  const successful = results.filter((r) => r.success).length
  return c.json({
    results,
    summary: { total: suggestionIds.length, successful, failed: suggestionIds.length - successful },
  }, 200)
})

// DELETE /suggestions/:id
const dismissRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Sugestões'],
  summary: 'Descartar uma sugestão',
  security: [{ Bearer: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'ID da sugestão' }) }),
  },
  responses: {
    200: { content: { 'application/json': { schema: SuccessResponseSchema } }, description: 'Sugestão descartada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(dismissRoute, async (c) => {
  const { id } = c.req.valid('param')
  try {
    await dismissSuggestion(id)
    return c.json({ success: true }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao descartar', status: 400 }, 400)
  }
})

// POST /suggestions/bulk-dismiss
const bulkDismissRoute = createRoute({
  method: 'post',
  path: '/bulk-dismiss',
  tags: ['Sugestões'],
  summary: 'Descartar sugestões em lote',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: BulkDismissInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: BulkResultSchema } }, description: 'Resultado do descarte' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(bulkDismissRoute, async (c) => {
  const { suggestionIds } = c.req.valid('json')
  const results = await dismissSuggestions(suggestionIds)
  const successful = results.filter((r) => r.success).length
  return c.json({
    results,
    summary: { total: suggestionIds.length, successful, failed: suggestionIds.length - successful },
  }, 200)
})

export default app
