import { z } from '@hono/zod-openapi'

export const InadimplenteDataSchema = z
  .object({
    propertyId: z.string().openapi({ example: 'cm1prop123', description: 'ID do imóvel' }),
    tenant: z.string().openapi({ example: 'João da Silva', description: 'Nome do inquilino' }),
    amount: z.number().openapi({ example: 1850.5, description: 'Valor em aberto em BRL' }),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .openapi({ example: '2026-02-10', description: 'Data de vencimento (YYYY-MM-DD)' }),
    settled: z.boolean().openapi({ example: false, description: 'Status de quitação' }),
  })
  .openapi('InadimplenteData')

export const InadimplenteSchema = z
  .object({
    id: z.string().openapi({ example: 'cm1inad123' }),
    data: InadimplenteDataSchema,
  })
  .openapi('Inadimplente')

export const InadimplenteListResponseSchema = z
  .object({
    data: z.array(InadimplenteSchema),
  })
  .openapi('InadimplenteListResponse')

export const InadimplenteDetailResponseSchema = z
  .object({
    data: InadimplenteSchema,
  })
  .openapi('InadimplenteDetailResponse')

export const CreateInadimplenteInputSchema = InadimplenteDataSchema.openapi('CreateInadimplenteInput')

export const UpdateInadimplenteInputSchema = InadimplenteDataSchema.openapi('UpdateInadimplenteInput')
