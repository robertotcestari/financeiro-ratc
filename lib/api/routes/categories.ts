import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { CategoryListResponseSchema } from '../schemas/categories'
import { ErrorSchema } from '../schemas/common'
import { getFormCategories } from '@/lib/core/database/form-data'

const app = new OpenAPIHono()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Categorias'],
  summary: 'Listar categorias',
  description: 'Retorna todas as categorias em estrutura hierárquica (3 níveis). Use parentId para montar a árvore.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: CategoryListResponseSchema } },
      description: 'Lista de categorias',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(listRoute, async (c) => {
  const categories = await getFormCategories()
  return c.json({ data: categories }, 200)
})

export default app
