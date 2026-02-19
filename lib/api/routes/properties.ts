import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { PropertyListResponseSchema } from '../schemas/properties'
import { ErrorSchema } from '../schemas/common'
import { getFormProperties } from '@/lib/core/database/form-data'

const app = new OpenAPIHono()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Imóveis'],
  summary: 'Listar imóveis',
  description: 'Retorna todos os imóveis ativos, ordenados por cidade e código.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: PropertyListResponseSchema } },
      description: 'Lista de imóveis',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(listRoute, async (c) => {
  const properties = await getFormProperties()
  return c.json({ data: properties }, 200)
})

export default app
