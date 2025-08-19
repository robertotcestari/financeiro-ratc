import { PrismaClient, ImportStatus } from '@/app/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

function parseBRLNumber(text: any): number | null {
  if (text === undefined || text === null) return null
  const s = String(text).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

function parseBRDate(text: any): Date | null {
  if (!text) return null
  const [d, m, y] = String(text).split('/')
  if (!y) return null
  return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)))
}

function inferAccountFromFile(fileName: string): string {
  if (fileName.includes('CC - PJBank')) return 'CC - PJBank'
  if (fileName.includes('CC - Sicredi')) return 'CC - Sicredi'
  if (fileName.includes('CI - SicrediInvest')) return 'CI - SicrediInvest'
  if (fileName.includes('CI - XP')) return 'CI - XP'
  throw new Error(`Unable to infer bank account from file: ${fileName}`)
}

async function ensureDefaultCategoryId(prisma: PrismaClient) {
  const cat = await prisma.category.findFirst({ where: { name: 'Outras Receitas Operacionais' } })
  if (!cat) throw new Error('Default category "Outras Receitas Operacionais" not found')
  return cat.id
}

async function upsertProcessedTransaction(
  prisma: PrismaClient,
  transaction: any,
  categoryId: string,
  propertyId: string | null,
  isTransfer: boolean,
  details: string | null
) {
  const dt = new Date(transaction.date)
  const year = dt.getUTCFullYear()
  const month = dt.getUTCMonth() + 1

  return prisma.processedTransaction.upsert({
    where: { transactionId: transaction.id },
    create: {
      transactionId: transaction.id,
      year,
      month,
      categoryId,
      propertyId: propertyId || null,
      isTransfer: Boolean(isTransfer),
      isReviewed: true,
      details: details || null
    },
    update: {
      categoryId,
      propertyId: propertyId || null,
      isTransfer: Boolean(isTransfer),
      isReviewed: true,
      details: details || null,
      updatedAt: new Date()
    }
  })
}

async function importFile(prisma: PrismaClient, filePath: string) {
  const fileName = path.basename(filePath)
  console.log(`   ➡️  Importing: ${fileName}`)

  const accountName = inferAccountFromFile(fileName)
  const bankAccount = await prisma.bankAccount.findUnique({ where: { name: accountName } })
  if (!bankAccount) throw new Error(`BankAccount not found: ${accountName}`)

  const content = fs.readFileSync(filePath, 'utf8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    delimiter: ',',
    bom: true,
    trim: true
  })

  let startDate: Date | null = null
  let endDate: Date | null = null

  const fileSize = fs.statSync(filePath).size
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      fileSize,
      bankAccountId: bankAccount.id,
      startDate: new Date(),
      endDate: new Date(),
      transactionCount: 0,
      status: ImportStatus.PROCESSING
    }
  })

  let inserted = 0
  for (const row of records) {
    const dateStr = row['Data']
    const desc = row['Descrição'] ?? row['MEMO'] ?? ''
    const valorStr = row['Valor']

    const date = parseBRDate(dateStr)
    if (!date) continue

    if (!startDate || date < startDate) startDate = date
    if (!endDate || date > endDate) endDate = date

    const amount = parseBRLNumber(valorStr)

    const descLower = String(desc || '').toLowerCase()
    if ((descLower.includes('saldo inicial') || descLower.includes('saldo anterior')) && (amount === 0 || amount === null)) {
      // Skip initial balance entries without creating transactions
      continue
    }

    // CSV is source of truth - do not filter duplicates

    const tx = await prisma.transaction.create({
      data: {
        bankAccountId: bankAccount.id,
        date,
        description: desc && desc.length ? String(desc) : '-',
        amount,
        balance: null, // No balance column in CSVs anymore
        importBatchId: batch.id
      }
    })

    // ProcessedTransactions will be created by the linked seeder instead

    inserted += 1
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      transactionCount: inserted,
      status: ImportStatus.COMPLETED
    }
  })

  console.log(`   ✅ ${fileName}: ${inserted} transactions (${startDate?.toISOString().slice(0,10)} → ${endDate?.toISOString().slice(0,10)})`)
}

export async function seedTransactions(prisma: PrismaClient) {
  console.log('💰 Importing transactions from CSV files...')
  
  const seederDir = path.resolve(__dirname)
  const csvFiles = fs.readdirSync(seederDir)
    .filter(f => f.endsWith('.csv'))
    .filter(f => !f.includes('DRE') && !f.includes('Contas Unificadas') && !f.includes('Linked'))
    .map(f => path.join(seederDir, f))
  
  if (csvFiles.length > 0) {
    for (const filePath of csvFiles) {
      await importFile(prisma, filePath)
    }
  } else {
    console.log('   ⚠️  No CSV files found to import.')
  }
}