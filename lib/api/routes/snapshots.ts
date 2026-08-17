import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { ErrorSchema } from '../schemas/common'
import {
  GenerateSnapshotsBodySchema,
  GenerateSnapshotsResponseSchema,
} from '../schemas/snapshots'
import { generateAllSnapshots } from '@/lib/core/database/account-snapshots'

const app = new OpenAPIHono()

const generateSnapshotsRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Snapshots'],
  summary: 'Gerar saldos (snapshots) das contas',
  description:
    'Recalcula os snapshots mensais de saldo (`account_snapshots`) de todas as contas ativas, ' +
    'mês a mês, em todo o período com transações. Equivale ao botão "Calcular Saldos" da tela ' +
    '/integridade. O DRE lê esta tabela para montar o bloco "Saldos Bancários" — rode antes de ' +
    'gerar os PDFs do fechamento, caso contrário os saldos saem desatualizados ou zerados.',
  security: [{ Bearer: [] }],
  request: {
    body: {
      required: false,
      content: { 'application/json': { schema: GenerateSnapshotsBodySchema } },
    },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: GenerateSnapshotsResponseSchema } },
      description: 'Snapshots gerados com sucesso',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao gerar snapshots',
    },
  },
})

app.openapi(generateSnapshotsRoute, async (c) => {
  const startedAt = Date.now()
  try {
    const body = c.req.valid('json') as { bankAccountId?: string } | undefined
    const snapshots = await generateAllSnapshots(body?.bankAccountId)

    // Resumo por conta, com o snapshot mais recente de cada uma
    const byAccount = new Map<string, typeof snapshots>()
    for (const snapshot of snapshots) {
      const list = byAccount.get(snapshot.bankAccountId) ?? []
      list.push(snapshot)
      byAccount.set(snapshot.bankAccountId, list)
    }

    const accounts = Array.from(byAccount.entries()).map(([bankAccountId, list]) => {
      const latest = list.reduce((acc, cur) =>
        cur.year > acc.year || (cur.year === acc.year && cur.month > acc.month) ? cur : acc
      )
      return {
        bankAccountId,
        snapshotCount: list.length,
        latest: {
          year: latest.year,
          month: latest.month,
          closingBalance: latest.closingBalance.toString(),
        },
      }
    })

    return c.json(
      {
        success: true as const,
        snapshotCount: snapshots.length,
        accounts,
        durationMs: Date.now() - startedAt,
      },
      200
    )
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao gerar snapshots',
        status: 500,
      },
      500
    )
  }
})

export default app
