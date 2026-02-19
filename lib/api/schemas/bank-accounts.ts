import { z } from '@hono/zod-openapi'

export const BankAccountSchema = z
  .object({
    id: z.string().openapi({ example: 'cm1abc123' }),
    name: z.string().openapi({ example: 'CC - Sicredi' }),
    bankName: z.string().nullable().openapi({ example: 'Sicredi' }),
    accountType: z.string().openapi({ example: 'CHECKING' }),
    isActive: z.boolean().openapi({ example: true }),
    balance: z.number().nullable().openapi({ example: 45000.0, description: 'Saldo mais recente' }),
    balanceDate: z.string().nullable().openapi({ example: '2025-12-31', description: 'Data do saldo' }),
  })
  .openapi('BankAccount')

export const BankAccountListResponseSchema = z
  .object({
    data: z.array(BankAccountSchema),
  })
  .openapi('BankAccountListResponse')
