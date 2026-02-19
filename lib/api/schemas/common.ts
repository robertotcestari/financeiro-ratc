import { z } from '@hono/zod-openapi'

export const PeriodQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000)
    .max(2100)
    .openapi({ example: 2025, description: 'Ano de referência' }),
  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .openapi({ example: 12, description: 'Mês (1-12). Se omitido, retorna o ano inteiro.' }),
})

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).openapi({ example: 1, description: 'Página' }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .default(50)
    .openapi({ example: 50, description: 'Itens por página (máx 500)' }),
})

export const ErrorSchema = z
  .object({
    error: z.string().openapi({ example: 'Não autorizado' }),
    status: z.number().int().openapi({ example: 401 }),
  })
  .openapi('Error')

export const PaginationMetaSchema = z
  .object({
    page: z.number().int().openapi({ example: 1 }),
    limit: z.number().int().openapi({ example: 50 }),
    total: z.number().int().openapi({ example: 123 }),
  })
  .openapi('PaginationMeta')
