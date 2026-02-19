import { z } from '@hono/zod-openapi'

export const SendMonthlyReportInputSchema = z
  .object({
    year: z.number().int().min(2000).max(2100).openapi({ example: 2025 }),
    month: z.number().int().min(1).max(12).openapi({ example: 12 }),
    recipients: z.array(z.string().email()).min(1).openapi({
      description: 'Lista de emails destinatários',
      example: ['roberto@ratc.com.br', 'fernanda@ratc.com.br'],
    }),
  })
  .openapi('SendMonthlyReportInput')

export const SendMonthlyReportResponseSchema = z
  .object({
    success: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional(),
  })
  .openapi('SendMonthlyReportResponse')
