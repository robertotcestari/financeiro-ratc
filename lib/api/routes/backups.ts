import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { ErrorSchema } from '../schemas/common'
import { CreateBackupResponseSchema } from '../schemas/backups'
import { createDatabaseBackup } from '@/lib/core/database/backup-service'

const app = new OpenAPIHono()

const createBackupRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Backups'],
  summary: 'Criar backup do banco de dados',
  description:
    'Executa um mysqldump usando a DATABASE_URL configurada no servidor e salva o arquivo de backup em diretório persistente quando disponível.',
  security: [{ Bearer: [] }],
  responses: {
    200: {
      content: { 'application/json': { schema: CreateBackupResponseSchema } },
      description: 'Backup criado com sucesso',
    },
    401: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Não autorizado',
    },
    500: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: 'Erro ao criar backup',
    },
  },
})

app.openapi(createBackupRoute, async (c) => {
  try {
    const result = await createDatabaseBackup()
    return c.json({ success: true as const, ...result }, 200)
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar backup', status: 500 },
      500
    )
  }
})

export default app
