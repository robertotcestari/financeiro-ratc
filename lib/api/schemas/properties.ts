import { z } from '@hono/zod-openapi'

export const PropertySchema = z
  .object({
    id: z.string().openapi({ example: 'cm1abc123' }),
    code: z.string().openapi({ example: 'CAT-01' }),
    description: z.string().nullable().openapi({ example: 'Sala Comercial - Centro' }),
    city: z.string().nullable().openapi({ example: 'Catanduva' }),
    address: z.string().nullable().openapi({ example: 'Rua São Paulo, 100' }),
  })
  .openapi('Property')

export const PropertyListResponseSchema = z
  .object({
    data: z.array(PropertySchema),
  })
  .openapi('PropertyListResponse')
