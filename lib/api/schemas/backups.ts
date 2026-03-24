import { z } from '@hono/zod-openapi'

export const CreateBackupResponseSchema = z
  .object({
    success: z.literal(true),
    filename: z.string().openapi({ example: 'backup-2026-03-24-10-15-00.sql.gz' }),
    filepath: z.string().openapi({ example: '/opt/financeiro-ratc/shared/backups/backup-2026-03-24-10-15-00.sql.gz' }),
    sizeBytes: z.number().int().openapi({ example: 245760 }),
    sizeHuman: z.string().openapi({ example: '0.23 MB' }),
    durationMs: z.number().int().openapi({ example: 1850 }),
    createdAt: z.string().datetime().openapi({ example: '2026-03-24T13:15:00.000Z' }),
  })
  .openapi('CreateBackupResponse')
