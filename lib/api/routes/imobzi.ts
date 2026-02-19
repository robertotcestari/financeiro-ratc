import { OpenAPIHono, createRoute } from '@hono/zod-openapi'
import { ErrorSchema } from '../schemas/common'
import {
  ImobziPreviewInputSchema,
  ImobziPreviewResponseSchema,
  ImobziImportInputSchema,
  ImobziImportResponseSchema,
} from '../schemas/imobzi'
import { getImobziTransactions } from '@/lib/features/imobzi/api'
import { prisma } from '@/lib/core/database/client'
import { Decimal } from '@prisma/client/runtime/library'

const app = new OpenAPIHono()

// POST /imobzi/preview
const previewRoute = createRoute({
  method: 'post',
  path: '/preview',
  tags: ['Importação Imobzi'],
  summary: 'Preview de importação Imobzi',
  description: 'Busca transações do Imobzi para o período e detecta duplicatas. Não grava no banco.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: ImobziPreviewInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: ImobziPreviewResponseSchema } }, description: 'Preview gerado' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro no preview' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(previewRoute, async (c) => {
  const { startDate, endDate, bankAccountId } = c.req.valid('json')

  try {
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } })
    if (!bankAccount) {
      return c.json({ error: 'Conta bancária não encontrada', status: 400 }, 400)
    }

    const transactions = await getImobziTransactions(startDate, endDate)

    const rangeStart = new Date(startDate)
    rangeStart.setDate(rangeStart.getDate() - 1)
    const rangeEnd = new Date(endDate)
    rangeEnd.setDate(rangeEnd.getDate() + 1)

    const existing = await prisma.transaction.findMany({
      where: { bankAccountId, date: { gte: rangeStart, lte: rangeEnd } },
    })

    const withDuplicates = transactions.map((tx) => {
      const txDate = new Date(tx.date)
      const absAmt = Math.abs(tx.value)
      const isDuplicate = existing.some((e) => {
        const dayDiff = Math.abs(txDate.getTime() - e.date.getTime())
        return dayDiff <= 86_400_000 && Math.abs(Math.abs(Number(e.amount)) - absAmt) <= 0.01
      })
      return { ...tx, isDuplicate }
    })

    const income = withDuplicates.filter((t) => t.type.toLowerCase().includes('income')).length
    const expense = withDuplicates.filter((t) => t.type.toLowerCase().includes('expense')).length
    const transfer = withDuplicates.filter((t) => t.type.toLowerCase().includes('transfer')).length
    const duplicates = withDuplicates.filter((t) => t.isDuplicate).length

    return c.json(
      {
        success: true,
        summary: {
          total: withDuplicates.length,
          income,
          expense,
          transfer,
          duplicates,
          new: withDuplicates.length - duplicates,
        },
        transactions: withDuplicates.map((t) => ({
          date: t.date,
          value: t.value,
          type: t.type,
          description: t.description,
          name: t.name,
          isDuplicate: t.isDuplicate,
        })),
      },
      200
    )
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro no preview Imobzi', status: 400 }, 400)
  }
})

// POST /imobzi/import
const importRoute = createRoute({
  method: 'post',
  path: '/import',
  tags: ['Importação Imobzi'],
  summary: 'Executar importação Imobzi',
  description: 'Busca transações do Imobzi, ignora duplicatas e importa as novas na conta indicada.',
  security: [{ Bearer: [] }],
  request: {
    body: { content: { 'application/json': { schema: ImobziImportInputSchema } } },
  },
  responses: {
    200: { content: { 'application/json': { schema: ImobziImportResponseSchema } }, description: 'Importação executada' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Erro na importação' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Não autorizado' },
  },
})

app.openapi(importRoute, async (c) => {
  const { startDate, endDate, bankAccountId } = c.req.valid('json')

  try {
    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } })
    if (!bankAccount) {
      return c.json({ error: 'Conta bancária não encontrada', status: 400 }, 400)
    }

    const transactions = await getImobziTransactions(startDate, endDate)

    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: `imobzi_${startDate}_${endDate}`,
        fileSize: 0,
        bankAccountId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        transactionCount: transactions.length,
        status: 'PROCESSING',
        fileType: 'IMOBZI',
      },
    })

    const rangeStart = new Date(startDate)
    rangeStart.setDate(rangeStart.getDate() - 1)
    const rangeEnd = new Date(endDate)
    rangeEnd.setDate(rangeEnd.getDate() + 1)

    const existing = await prisma.transaction.findMany({
      where: { bankAccountId, date: { gte: rangeStart, lte: rangeEnd } },
    })

    const seenKeys = new Set<string>()
    let skipped = 0
    let failed = 0

    const toCreate: Array<{
      date: Date
      description: string
      amount: Decimal
      ofxTransId: string
      ofxAccountId: string
    }> = []

    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      const absAmt = Math.abs(tx.value)
      const absCents = Math.round(absAmt * 100)
      const key = `${txDate.toISOString().slice(0, 10)}:${absCents}`

      // Skip within-batch duplicates
      if (seenKeys.has(key)) { skipped++; continue }
      seenKeys.add(key)

      // Skip DB duplicates
      const isDuplicate = existing.some((e) => {
        const dayDiff = Math.abs(txDate.getTime() - e.date.getTime())
        return dayDiff <= 86_400_000 && Math.abs(Math.abs(Number(e.amount)) - absAmt) <= 0.01
      })
      if (isDuplicate) { skipped++; continue }

      // Sign: expense and transfer are negative
      const type = tx.type.toLowerCase()
      const signedAmt = type.includes('expense') || type.includes('transfer') ? -absAmt : absAmt

      toCreate.push({
        date: txDate,
        description: tx.description,
        amount: new Decimal(signedAmt),
        ofxTransId: `imobzi_${txDate.getTime()}_${absCents}`,
        ofxAccountId: 'IMOBZI',
      })
    }

    let imported = 0
    if (toCreate.length > 0) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.transaction.createMany({
            data: toCreate.map((t) => ({
              bankAccountId,
              importBatchId: importBatch.id,
              date: t.date,
              description: t.description,
              amount: t.amount,
              ofxTransId: t.ofxTransId,
              ofxAccountId: t.ofxAccountId,
            })),
            skipDuplicates: true,
          })

          const created = await tx.transaction.findMany({
            where: { importBatchId: importBatch.id },
            select: { id: true, date: true },
          })

          await tx.processedTransaction.createMany({
            data: created.map((t) => ({
              transactionId: t.id,
              year: t.date.getFullYear(),
              month: t.date.getMonth() + 1,
            })),
            skipDuplicates: true,
          })

          imported = created.length
        })
      } catch {
        failed = toCreate.length
      }
    }

    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: { status: 'COMPLETED', transactionCount: imported + skipped + failed },
    })

    return c.json({ success: true, importBatchId: importBatch.id, importedCount: imported, skippedCount: skipped, failedCount: failed }, 200)
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Erro na importação Imobzi', status: 400 }, 400)
  }
})

export default app
