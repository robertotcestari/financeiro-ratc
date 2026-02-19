import { z } from '@hono/zod-openapi'

export const DetectTransfersInputSchema = z
  .object({
    startDate: z.string().openapi({ example: '2025-12-01', description: 'Data início (ISO)' }),
    endDate: z.string().openapi({ example: '2025-12-31', description: 'Data fim (ISO)' }),
  })
  .openapi('DetectTransfersInput')

export const PotentialTransferSchema = z
  .object({
    origin: z.unknown(),
    destination: z.unknown().optional(),
    confidence: z.number(),
  })
  .openapi('PotentialTransfer')

export const DetectTransfersResponseSchema = z
  .object({
    data: z.array(PotentialTransferSchema),
  })
  .openapi('DetectTransfersResponse')

export const ConfirmTransferInputSchema = z
  .object({
    originTransactionId: z.string().openapi({ description: 'ID da transação processada de origem (débito)' }),
    destinationTransactionId: z.string().openapi({ description: 'ID da transação processada de destino (crédito)' }),
  })
  .openapi('ConfirmTransferInput')
