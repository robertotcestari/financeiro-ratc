import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { ErrorSchema } from '../schemas/common'
import {
  VendorDetailResponseSchema,
  VendorInputSchema,
  VendorListResponseSchema,
} from '../schemas/vendors'
import {
  createVendor,
  getVendorById,
  listVendors,
  updateVendor,
} from '@/lib/core/database/vendors'
import { PayableError } from '@/lib/core/payables/errors'

const app = new OpenAPIHono()
const paramsSchema = z.object({ id: z.string() })

function vendorPayload(vendor: {
  id: string
  name: string
  document: string | null
  email: string | null
  phone: string | null
  notes: string | null
  isActive: boolean
  defaultCategoryId: string | null
  defaultPropertyId: string | null
}) {
  return {
    id: vendor.id,
    name: vendor.name,
    document: vendor.document,
    email: vendor.email,
    phone: vendor.phone,
    notes: vendor.notes,
    isActive: vendor.isActive,
    defaultCategoryId: vendor.defaultCategoryId,
    defaultPropertyId: vendor.defaultPropertyId,
  }
}

app.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['Fornecedores'],
    summary: 'Listar fornecedores',
    security: [{ Bearer: [] }],
    responses: {
      200: {
        content: { 'application/json': { schema: VendorListResponseSchema } },
        description: 'Lista de fornecedores',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não autorizado',
      },
    },
  }),
  async (c) => {
    const vendors = await listVendors()
    return c.json({ data: vendors.map(vendorPayload) }, 200)
  }
)

app.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Fornecedores'],
    summary: 'Criar fornecedor',
    security: [{ Bearer: [] }],
    request: {
      body: { content: { 'application/json': { schema: VendorInputSchema } } },
    },
    responses: {
      201: {
        content: { 'application/json': { schema: VendorDetailResponseSchema } },
        description: 'Fornecedor criado',
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
      const vendor = await createVendor(c.req.valid('json'))
      return c.json({ data: vendorPayload(vendor) }, 201)
    } catch (error) {
      const message = error instanceof PayableError ? error.message : 'Erro ao criar fornecedor'
      return c.json({ error: message, status: 400 }, 400)
    }
  }
)

app.openapi(
  createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Fornecedores'],
    summary: 'Atualizar fornecedor',
    security: [{ Bearer: [] }],
    request: {
      params: paramsSchema,
      body: { content: { 'application/json': { schema: VendorInputSchema } } },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: VendorDetailResponseSchema } },
        description: 'Fornecedor atualizado',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Não encontrado',
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
      const vendor = await updateVendor(c.req.valid('param').id, c.req.valid('json'))
      return c.json({ data: vendorPayload(vendor) }, 200)
    } catch (error) {
      if (error instanceof PayableError && error.code === 'not_found') {
        return c.json({ error: error.message, status: 404 }, 404)
      }
      const message = error instanceof PayableError ? error.message : 'Erro ao atualizar fornecedor'
      return c.json({ error: message, status: 400 }, 400)
    }
  }
)

app.openapi(
  createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Fornecedores'],
    summary: 'Detalhar fornecedor',
    security: [{ Bearer: [] }],
    request: { params: paramsSchema },
    responses: {
      200: {
        content: { 'application/json': { schema: VendorDetailResponseSchema } },
        description: 'Fornecedor',
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
    const vendor = await getVendorById(c.req.valid('param').id)
    if (!vendor) {
      return c.json({ error: 'Fornecedor não encontrado', status: 404 }, 404)
    }
    return c.json({ data: vendorPayload(vendor) }, 200)
  }
)

export default app
