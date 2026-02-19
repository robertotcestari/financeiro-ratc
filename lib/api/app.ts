import { OpenAPIHono, z, createRoute } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { apiKeyAuth } from './middleware/auth'
import transactionsRoutes from './routes/transactions'
import categoriesRoutes from './routes/categories'
import bankAccountsRoutes from './routes/bank-accounts'
import propertiesRoutes from './routes/properties'
import dreRoutes from './routes/dre'
import ofxRoutes from './routes/ofx'
import suggestionsRoutes from './routes/suggestions'
import transfersRoutes from './routes/transfers'
import rulesRoutes from './routes/rules'
import reportsRoutes from './routes/reports'

const app = new OpenAPIHono().basePath('/api/v1')

// --- Public routes (no auth) ---

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Sistema'],
  summary: 'Health check',
  description: 'Verifica se a API está funcionando. Não requer autenticação.',
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            version: z.string().openapi({ example: '1.0.0' }),
          }),
        },
      },
      description: 'API funcionando',
    },
  },
})

app.openapi(healthRoute, (c) => {
  return c.json({ status: 'ok', version: '1.0.0' }, 200)
})

// --- Protected routes (bearer auth) ---

app.use('/transactions/*', apiKeyAuth)
app.use('/transactions', apiKeyAuth)
app.use('/categories/*', apiKeyAuth)
app.use('/categories', apiKeyAuth)
app.use('/bank-accounts/*', apiKeyAuth)
app.use('/bank-accounts', apiKeyAuth)
app.use('/properties/*', apiKeyAuth)
app.use('/properties', apiKeyAuth)
app.use('/dre/*', apiKeyAuth)
app.use('/dre', apiKeyAuth)
app.use('/ofx/*', apiKeyAuth)
app.use('/ofx', apiKeyAuth)
app.use('/suggestions/*', apiKeyAuth)
app.use('/suggestions', apiKeyAuth)
app.use('/transfers/*', apiKeyAuth)
app.use('/transfers', apiKeyAuth)
app.use('/rules/*', apiKeyAuth)
app.use('/rules', apiKeyAuth)
app.use('/reports/*', apiKeyAuth)
app.use('/reports', apiKeyAuth)

// --- Route modules ---

app.route('/transactions', transactionsRoutes)
app.route('/categories', categoriesRoutes)
app.route('/bank-accounts', bankAccountsRoutes)
app.route('/properties', propertiesRoutes)
app.route('/dre', dreRoutes)
app.route('/ofx', ofxRoutes)
app.route('/suggestions', suggestionsRoutes)
app.route('/transfers', transfersRoutes)
app.route('/rules', rulesRoutes)
app.route('/reports', reportsRoutes)

// --- OpenAPI spec ---

app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    title: 'Financeiro RATC API',
    version: '1.0.0',
    description:
      'API REST do sistema de gestão financeira RATC. Importação OFX, categorização de transações, sugestões automáticas, transferências, regras de categorização e relatórios financeiros (DRE).',
  },
})

// Register Bearer security scheme
app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  description: 'API Key no formato Bearer Token. Envie no header: Authorization: Bearer <API_KEY>',
})

// --- Scalar docs UI ---

app.get(
  '/scalar',
  Scalar({
    url: '/api/v1/doc',
    pageTitle: 'Financeiro RATC - API Docs',
    theme: 'purple',
  })
)

export default app
