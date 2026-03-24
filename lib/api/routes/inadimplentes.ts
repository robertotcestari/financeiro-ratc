import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import {
  CreateInadimplenteInputSchema,
  InadimplenteDetailResponseSchema,
  InadimplenteListResponseSchema,
  UpdateInadimplenteInputSchema,
} from '../schemas/inadimplentes'
import { ErrorSchema } from '../schemas/common'
import { SuccessResponseSchema } from '../schemas/transactions'
import {
  createInadimplente,
  deleteInadimplente,
  getInadimplenteById,
  listInadimplentes,
  updateInadimplente,
} from '@/lib/core/database/inadimplentes'

const app = new OpenAPIHono()

const paramsSchema = z.object({
  id: z.string().openapi({ example: 'cm1inad123' }),
})

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Inadimplentes'],
  summary: 'Listar inadimplentes',
  description: 'Retorna os inadimplentes cadastrados no sistema financeiro.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: InadimplenteListResponseSchema } },
      description: 'Lista de inadimplentes',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(listRoute, async (c) => {
  const items = await listInadimplentes()
  return c.json({ data: items }, 200)
})

const detailRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Inadimplentes'],
  summary: 'Detalhar inadimplente',
  security: [{ Bearer: [] }],
  request: { params: paramsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: InadimplenteDetailResponseSchema } },
      description: 'Detalhe do inadimplente',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Inadimplente não encontrado',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(detailRoute, async (c) => {
  const { id } = c.req.valid('param')
  const item = await getInadimplenteById(id)

  if (!item) {
    return c.json({ error: 'Inadimplente não encontrado', status: 404 }, 404)
  }

  return c.json({ data: item }, 200)
})

const createRouteDef = createRoute({
  method: 'post',
  path: '/',
  tags: ['Inadimplentes'],
  summary: 'Criar inadimplente',
  description: 'Cria um novo registro de inadimplência no sistema.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: CreateInadimplenteInputSchema } } },
  },
  responses: {
    201: {
      content: { 'application/json': { schema: InadimplenteDetailResponseSchema } },
      description: 'Inadimplente criado',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao criar inadimplente',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(createRouteDef, async (c) => {
  const input = c.req.valid('json')

  try {
    const result = await createInadimplente(input)
    const item = await getInadimplenteById(result.id)

    if (!item) {
      return c.json({ error: 'Erro ao carregar inadimplente criado', status: 400 }, 400)
    }

    return c.json({ data: item }, 201)
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar inadimplente', status: 400 },
      400
    )
  }
})

const updateRoute = createRoute({
  method: 'put',
  path: '/{id}',
  tags: ['Inadimplentes'],
  summary: 'Atualizar inadimplente',
  description: 'Atualiza todos os campos de um inadimplente existente.',
  security: [{ Bearer: [] }],
  request: {
    params: paramsSchema,
    body: { content: { 'application/json': { schema: UpdateInadimplenteInputSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: InadimplenteDetailResponseSchema } },
      description: 'Inadimplente atualizado',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Inadimplente não encontrado',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao atualizar inadimplente',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(updateRoute, async (c) => {
  const { id } = c.req.valid('param')
  const input = c.req.valid('json')

  try {
    await updateInadimplente(id, input)
    const item = await getInadimplenteById(id)

    if (!item) {
      return c.json({ error: 'Inadimplente não encontrado', status: 404 }, 404)
    }

    return c.json({ data: item }, 200)
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      return c.json({ error: 'Inadimplente não encontrado', status: 404 }, 404)
    }

    return c.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar inadimplente', status: 400 },
      400
    )
  }
})

const deleteRoute = createRoute({
  method: 'delete',
  path: '/{id}',
  tags: ['Inadimplentes'],
  summary: 'Deletar inadimplente',
  security: [{ Bearer: [] }],
  request: { params: paramsSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: SuccessResponseSchema } },
      description: 'Inadimplente deletado',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao deletar inadimplente',
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Inadimplente não encontrado',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(deleteRoute, async (c) => {
  const { id } = c.req.valid('param')

  try {
    await deleteInadimplente(id)
    return c.json({ success: true }, 200)
  } catch (error) {
    if (error instanceof Error && error.message === 'not_found') {
      return c.json({ error: 'Inadimplente não encontrado', status: 404 }, 404)
    }

    return c.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar inadimplente', status: 400 },
      400
    )
  }
})

export default app
