import { z } from '@hono/zod-openapi'

export const ImobziPreviewInputSchema = z
  .object({
    startDate: z.string().openapi({ example: '2026-01-01', description: 'Data inicial (YYYY-MM-DD)' }),
    endDate: z.string().openapi({ example: '2026-01-31', description: 'Data final (YYYY-MM-DD)' }),
    bankAccountId: z.string().openapi({ example: 'cmejz0tjr0001h2ywdhgddbe7', description: 'ID da conta bancária destino' }),
  })
  .openapi('ImobziPreviewInput')

export const ImobziPreviewTransactionSchema = z.object({
  date: z.string(),
  value: z.number(),
  type: z.string(),
  description: z.string(),
  name: z.string().nullable(),
  isDuplicate: z.boolean(),
})

export const ImobziPreviewResponseSchema = z
  .object({
    success: z.boolean(),
    summary: z.object({
      total: z.number(),
      income: z.number(),
      expense: z.number(),
      transfer: z.number(),
      duplicates: z.number(),
      new: z.number(),
    }),
    transactions: z.array(ImobziPreviewTransactionSchema),
  })
  .openapi('ImobziPreviewResponse')

export const ImobziImportInputSchema = z
  .object({
    startDate: z.string().openapi({ example: '2026-01-01' }),
    endDate: z.string().openapi({ example: '2026-01-31' }),
    bankAccountId: z.string().openapi({ example: 'cmejz0tjr0001h2ywdhgddbe7' }),
  })
  .openapi('ImobziImportInput')

export const ImobziImportResponseSchema = z
  .object({
    success: z.boolean(),
    importBatchId: z.string(),
    importedCount: z.number(),
    skippedCount: z.number(),
    failedCount: z.number(),
  })
  .openapi('ImobziImportResponse')
