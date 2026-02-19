import { z } from '@hono/zod-openapi'
import { PeriodQuerySchema } from './common'

export const DREQuerySchema = PeriodQuerySchema

export const DRELineSchema = z
  .object({
    id: z.string().openapi({ example: 'subtotal-receitas-operacionais' }),
    name: z.string().openapi({ example: 'Total de Receitas Operacionais' }),
    level: z.number().int().openapi({ example: 1 }),
    lineType: z
      .enum(['DETAIL', 'SUBTOTAL', 'TOTAL', 'SEPARATOR', 'HEADER'])
      .openapi({ example: 'SUBTOTAL' }),
    amount: z.number().openapi({ example: 25000.0 }),
    isBold: z.boolean().openapi({ example: true }),
    showInReport: z.boolean().openapi({ example: true }),
  })
  .openapi('DRELine')

export const DREResponseSchema = z
  .object({
    data: z.array(DRELineSchema),
    period: z.object({
      year: z.number().int().openapi({ example: 2025 }),
      month: z.number().int().nullable().openapi({ example: 12 }),
    }),
  })
  .openapi('DREResponse')
