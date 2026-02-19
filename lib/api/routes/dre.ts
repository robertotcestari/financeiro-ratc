import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { DREQuerySchema, DREResponseSchema } from '../schemas/dre'
import { ErrorSchema } from '../schemas/common'
import { generateDRE } from '@/lib/core/database/dre'

const app = new OpenAPIHono()

const dreRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Relatórios'],
  summary: 'Gerar DRE',
  description:
    'Gera o Demonstrativo de Resultado do Exercício (DRE) para o período especificado. Inclui saldos bancários, receitas/despesas operacionais e não operacionais, lucro operacional e resultado de caixa.',
  security: [{ Bearer: [] }],
  request: {
    query: DREQuerySchema,
  },
  responses: {
    200: {
      content: { 'application/json': { schema: DREResponseSchema } },
      description: 'DRE do período',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(dreRoute, async (c) => {
  const { year, month } = c.req.valid('query')

  const dreLines = await generateDRE(year, month)

  const data = dreLines.map((line) => ({
    id: line.id,
    name: line.name,
    level: line.level,
    lineType: line.lineType,
    amount: line.amount,
    isBold: line.isBold,
    showInReport: line.showInReport,
  }))

  return c.json(
    {
      data,
      period: { year, month: month ?? null },
    },
    200
  )
})

export default app
