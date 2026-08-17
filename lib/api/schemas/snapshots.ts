import { z } from '@hono/zod-openapi'

export const GenerateSnapshotsBodySchema = z
  .object({
    bankAccountId: z
      .string()
      .optional()
      .openapi({
        example: 'cmejz0ti50000h2ywke8fyjxp',
        description:
          'Restringe a geração a uma conta. Omita para gerar de todas as contas ativas.',
      }),
  })
  .openapi('GenerateSnapshotsBody')

export const GenerateSnapshotsResponseSchema = z
  .object({
    success: z.literal(true),
    snapshotCount: z.number().int().openapi({ example: 148 }),
    accounts: z
      .array(
        z.object({
          bankAccountId: z.string().openapi({ example: 'cmejz0ti50000h2ywke8fyjxp' }),
          snapshotCount: z.number().int().openapi({ example: 37 }),
          latest: z
            .object({
              year: z.number().int().openapi({ example: 2026 }),
              month: z.number().int().openapi({ example: 7 }),
              closingBalance: z.string().openapi({ example: '0.00' }),
            })
            .nullable(),
        })
      )
      .openapi({ description: 'Resumo por conta processada' }),
    durationMs: z.number().int().openapi({ example: 4210 }),
  })
  .openapi('GenerateSnapshotsResponse')
