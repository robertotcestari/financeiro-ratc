import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { SendMonthlyReportInputSchema, SendMonthlyReportResponseSchema } from '../schemas/reports'
import { ErrorSchema } from '../schemas/common'
import { sendMonthlyReportEmail } from '@/app/(protected)/relatorios/mensal/actions'

const app = new OpenAPIHono()

// POST /reports/monthly/send
const sendMonthlyRoute = createRoute({
  method: 'post',
  path: '/monthly/send',
  tags: ['Relatórios'],
  summary: 'Enviar relatório mensal por email',
  description: 'Gera e envia o relatório mensal (DRE comparativo, inadimplentes, aluguéis) para os destinatários informados.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: SendMonthlyReportInputSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: SendMonthlyReportResponseSchema } },
      description: 'Email enviado com sucesso',
    },
    400: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao enviar',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
  },
})

app.openapi(sendMonthlyRoute, async (c) => {
  const { year, month, recipients } = c.req.valid('json')

  const result = await sendMonthlyReportEmail({ year, month, recipients })

  if (!result.success) {
    return c.json({ error: result.error || 'Erro ao enviar relatório', status: 400 }, 400)
  }

  return c.json({ success: true, messageId: result.messageId }, 200)
})

export default app
