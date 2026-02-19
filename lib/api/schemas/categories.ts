import { z } from '@hono/zod-openapi'

export const CategorySchema = z
  .object({
    id: z.string().openapi({ example: 'cm1abc123' }),
    name: z.string().openapi({ example: 'Aluguel' }),
    level: z.number().int().openapi({ example: 2 }),
    orderIndex: z.number().int().openapi({ example: 1 }),
    parentId: z.string().nullable().openapi({ example: 'cm1parent456' }),
  })
  .openapi('Category')

export const CategoryListResponseSchema = z
  .object({
    data: z.array(CategorySchema),
  })
  .openapi('CategoryListResponse')
