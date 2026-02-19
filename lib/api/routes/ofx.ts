import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import {
  OFXParseInputSchema,
  OFXParseResponseSchema,
  OFXPreviewInputSchema,
  OFXPreviewResponseSchema,
  OFXImportInputSchema,
  OFXImportResponseSchema,
} from '../schemas/ofx'
import { ErrorSchema } from '../schemas/common'
import { OFXParserService } from '@/lib/features/ofx/parser'
import { ImportPreviewService } from '@/lib/features/ofx/import-preview'
import { ImportService } from '@/lib/features/ofx/import-service'

const app = new OpenAPIHono()

// POST /ofx/parse
const parseRoute = createRoute({
  method: 'post',
  path: '/parse',
  tags: ['Importação OFX'],
  summary: 'Parsear arquivo OFX',
  description: 'Parseia o conteúdo de um arquivo OFX sem gravar no banco. Retorna contas e transações encontradas.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: OFXParseInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: OFXParseResponseSchema } }, description: 'Parse resultado' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro no parsing' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(parseRoute, async (c) => {
  const { fileContent } = c.req.valid('json')

  try {
    const parser = new OFXParserService()
    const result = await parser.parseOfxString(fileContent)

    return c.json(
      {
        success: result.success,
        version: result.version ?? null,
        format: result.format ?? null,
        accounts: result.accounts.map((a) => ({
          accountId: a.accountId,
          bankId: a.bankId ?? null,
          accountType: a.accountType,
          currency: null,
        })),
        transactions: result.transactions.map((t) => ({
          transactionId: t.transactionId,
          accountId: t.accountId,
          date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
          amount: t.amount,
          description: t.description,
          type: t.type,
          memo: t.memo ?? null,
        })),
        errors: result.errors.map((e) => ({ message: e.message })),
      },
      200
    )
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao parsear OFX', status: 400 }, 400)
  }
})

// POST /ofx/preview
const previewRoute = createRoute({
  method: 'post',
  path: '/preview',
  tags: ['Importação OFX'],
  summary: 'Preview de importação',
  description: 'Gera preview da importação com detecção de duplicatas e sugestões de categorização. Não grava no banco.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: OFXPreviewInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: OFXPreviewResponseSchema } }, description: 'Preview gerado' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro no preview' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(previewRoute, async (c) => {
  const { fileContent, bankAccountId } = c.req.valid('json')

  try {
    const parser = new OFXParserService()
    const parseResult = await parser.parseOfxString(fileContent)

    if (!parseResult.success) {
      return c.json({ error: 'Falha ao parsear OFX', status: 400 }, 400)
    }

    const previewService = new ImportPreviewService()
    const preview = await previewService.generatePreviewFromParsedResult(parseResult, bankAccountId)

    return c.json(
      {
        success: preview.success,
        transactions: preview.transactions.map((t) => ({
          transactionId: t.transaction.transactionId,
          date: t.transaction.date instanceof Date ? t.transaction.date.toISOString() : String(t.transaction.date),
          amount: t.transaction.amount,
          description: t.transaction.description,
          recommendedAction: t.recommendedAction,
          isDuplicate: t.isDuplicate,
          duplicateConfidence: t.duplicateMatches?.[0]?.confidence,
        })),
        summary: preview.summary,
      },
      200
    )
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro ao gerar preview', status: 400 }, 400)
  }
})

// POST /ofx/import
const importRoute = createRoute({
  method: 'post',
  path: '/import',
  tags: ['Importação OFX'],
  summary: 'Executar importação',
  description: 'Executa a importação de transações OFX. Requer preview prévio para determinar ações por transação.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: OFXImportInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: OFXImportResponseSchema } }, description: 'Importação executada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro na importação' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(importRoute, async (c) => {
  const { fileContent, bankAccountId, transactionActions, transactionCategories, transactionProperties } =
    c.req.valid('json')

  try {
    // Parse
    const parser = new OFXParserService()
    const parseResult = await parser.parseOfxString(fileContent)

    if (!parseResult.success) {
      return c.json({ error: 'Falha ao parsear OFX', status: 400 }, 400)
    }

    // Preview
    const previewService = new ImportPreviewService()
    const preview = await previewService.generatePreviewFromParsedResult(parseResult, bankAccountId)

    if (!preview.success) {
      return c.json({ error: 'Falha ao gerar preview', status: 400 }, 400)
    }

    // Import
    const importService = new ImportService()
    const result = await importService.executeImport(preview, {
      bankAccountId,
      transactionActions,
      transactionCategories: transactionCategories ?? undefined,
      transactionProperties: transactionProperties ?? undefined,
      createProcessedTransactions: true,
    })

    return c.json(
      {
        success: result.success,
        importBatchId: result.importBatchId,
        summary: result.summary,
        importedCount: result.transactions.imported.length,
        skippedCount: result.transactions.skipped.length,
        failedCount: result.transactions.failed.length,
      },
      200
    )
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro na importação', status: 400 }, 400)
  }
})

export default app
