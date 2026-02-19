import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { BankAccountListResponseSchema } from '../schemas/bank-accounts'
import { ErrorSchema } from '../schemas/common'
import { getFormBankAccounts } from '@/lib/core/database/form-data'
import { getAccountBalances } from '@/lib/core/database/transactions'

const app = new OpenAPIHono()

const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Contas Bancárias'],
  summary: 'Listar contas bancárias',
  description: 'Retorna todas as contas bancárias com saldo mais recente.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: BankAccountListResponseSchema } },
      description: 'Lista de contas bancárias com saldos',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(listRoute, async (c) => {
  const [accounts, balances] = await Promise.all([
    getFormBankAccounts(),
    getAccountBalances(),
  ])

  const balanceMap = new Map(
    balances.map((b) => [b.bankAccountId, { balance: b.balance, date: b.date }])
  )

  const data = accounts.map((acc) => {
    const bal = balanceMap.get(acc.id)
    return {
      id: acc.id,
      name: acc.name,
      bankName: acc.bankName,
      accountType: acc.accountType,
      isActive: acc.isActive,
      balance: bal?.balance ?? null,
      balanceDate: bal?.date ? bal.date.toISOString().split('T')[0] : null,
    }
  })

  return c.json({ data }, 200)
})

export default app
