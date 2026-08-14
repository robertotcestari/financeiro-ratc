import { z } from '@hono/zod-openapi'

const statusEnum = z.enum(['OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED'])
const methodEnum = z.enum(['BOLETO', 'PIX', 'BANK_TRANSFER', 'AUTO_DEBIT', 'OTHER'])

export const PayableInstallmentInputSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive(),
  paymentMethod: methodEnum.optional(),
  boletoLine: z.string().nullable().optional(),
  boletoBarcode: z.string().nullable().optional(),
})

export const CreatePayableInputSchema = z
  .object({
    vendorId: z.string(),
    description: z.string().min(1),
    documentNumber: z.string().nullable().optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    competenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    categoryId: z.string().nullable().optional(),
    propertyId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    installments: z.array(PayableInstallmentInputSchema).min(1),
  })
  .openapi('CreatePayableInput')

export const UpdatePayableInputSchema = z
  .object({
    description: z.string().min(1).optional(),
    documentNumber: z.string().nullable().optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    competenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    categoryId: z.string().nullable().optional(),
    propertyId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .openapi('UpdatePayableInput')

export const CancelPayableInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .openapi('CancelPayableInput')

export const SettleInstallmentInputSchema = z
  .object({
    bankAccountId: z.string(),
    amount: z.number().positive().optional(),
    paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    method: methodEnum.optional(),
    transactionId: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .openapi('SettleInstallmentInput')

export const ReverseSettlementInputSchema = z
  .object({
    reason: z.string().optional(),
  })
  .openapi('ReverseSettlementInput')

export const InstallmentListItemSchema = z
  .object({
    id: z.string(),
    payableId: z.string(),
    installmentNumber: z.number().int(),
    dueDate: z.string(),
    amount: z.number(),
    paidAmount: z.number(),
    remainingAmount: z.number(),
    paymentMethod: methodEnum,
    status: statusEnum,
    isOverdue: z.boolean(),
    isDueToday: z.boolean(),
    description: z.string(),
    vendorName: z.string(),
    propertyCode: z.string().nullable(),
  })
  .openapi('PayableInstallmentListItem')

export const PayableListQuerySchema = z.object({
  status: statusEnum.optional(),
  vendorId: z.string().optional(),
  propertyId: z.string().optional(),
  categoryId: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().optional(),
})

export const PayableListResponseSchema = z
  .object({ data: z.array(InstallmentListItemSchema) })
  .openapi('PayableListResponse')

export const PayableDetailResponseSchema = z
  .object({ data: z.unknown() })
  .openapi('PayableDetailResponse')

export const RecurrenceGenerateInputSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
  })
  .openapi('RecurrenceGenerateInput')
