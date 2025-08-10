/*
  Import legacy CSVs from old_implementation into Prisma models.
  - Creates ImportBatch per file
  - Inserts Transaction rows (dedup within the same batch by [bankAccountId, date, amount, description, balance])
  - Upserts AccountBalance snapshots per date from CSV "Saldo"
  - Importa e cria UnifiedTransaction com fallback de categoria padrão
*/

/* eslint-disable */

const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
const { PrismaClient } = require('../app/generated/prisma')

const prisma = new PrismaClient()

function parseBRLNumber(text) {
  if (text === undefined || text === null) return null
  const s = String(text).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

function parseBRDate(text) {
  if (!text) return null
  // Accept dd/mm/yyyy or d/m/yyyy
  const [d, m, y] = String(text).split('/')
  if (!y) return null
  // Use UTC to avoid timezone shifts
  return new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10)))
}

function inferAccountFromFile(fileName) {
  if (fileName.includes('CC - PJBank')) return 'CC - PJBank'
  if (fileName.includes('CC - Sicredi')) return 'CC - Sicredi'
  if (fileName.includes('CI - SicrediInvest')) return 'CI - SicrediInvest'
  if (fileName.includes('CI - XP')) return 'CI - XP'
  throw new Error(`Unable to infer bank account from file: ${fileName}`)
}

// Category rules were removed from the schema; keep a simple default-only strategy.

async function ensureDefaultCategoryId() {
  // Default category: 'Outras Receitas'
  const cat = await prisma.category.findFirst({ where: { name: 'Outras Receitas' } })
  if (!cat) throw new Error('Default category "Outras Receitas" not found')
  return cat.id
}

async function upsertUnifiedTransaction(tx, transaction, categoryId, propertyId, isTransfer, details) {
  const dt = new Date(transaction.date)
  const year = dt.getUTCFullYear()
  const month = dt.getUTCMonth() + 1

  return tx.unifiedTransaction.upsert({
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

async function importFile(filePath) {
  const fileName = path.basename(filePath)
  console.log(`\n➡️  Importing: ${fileName}`)

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

  let startDate = null
  let endDate = null

  const fileSize = fs.statSync(filePath).size
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      fileSize,
      bankAccountId: bankAccount.id,
      startDate: new Date(), // temp; update later
      endDate: new Date(),   // temp; update later
      transactionCount: 0,
      status: 'PROCESSING'
    }
  })

  // No rules to load; rely on defaults only

  let inserted = 0
  for (const row of records) {
    const dateStr = row['Data']
    const desc = row['Descrição'] ?? row['MEMO'] ?? ''
    const valorStr = row['Valor']
    const saldoStr = row['Saldo']

    const date = parseBRDate(dateStr)
    if (!date) continue

    // Track range
    if (!startDate || date < startDate) startDate = date
    if (!endDate || date > endDate) endDate = date

    const amount = parseBRLNumber(valorStr)
    const balance = parseBRLNumber(saldoStr)

    // Skip pure starting-balance rows with 0,00 amount
    const descLower = String(desc || '').toLowerCase()
    if ((descLower.includes('saldo inicial') || descLower.includes('saldo anterior')) && (amount === 0 || amount === null)) {
      // But still record an AccountBalance snapshot
      if (balance != null) {
        await prisma.accountBalance.upsert({
          where: { bankAccountId_date: { bankAccountId: bankAccount.id, date } },
          update: { balance },
          create: { bankAccountId: bankAccount.id, date, balance }
        })
      }
      continue
    }

  // Only skip if we already processed this exact transaction in this import batch
  // This prevents double-processing during re-runs while allowing legitimate duplicates
    const alreadyProcessed = await prisma.transaction.findFirst({
      where: {
        bankAccountId: bankAccount.id, 
        date, 
        amount,
    description: desc && desc.length ? String(desc) : '-',
    importBatchId: batch.id,
    ...(balance != null ? { balance } : {})
      }
    })
    
    if (alreadyProcessed) {
      // Already processed this exact row in this batch - skip
      if (balance != null) {
        await prisma.accountBalance.upsert({
          where: { bankAccountId_date: { bankAccountId: bankAccount.id, date } },
          update: { balance },
          create: { bankAccountId: bankAccount.id, date, balance }
        })
      }
      continue
    }

    // Create transaction
  const tx = await prisma.transaction.create({
      data: {
        bankAccountId: bankAccount.id,
        date,
        description: desc && desc.length ? String(desc) : '-',
    amount,
    balance: balance != null ? balance : null,
        importBatchId: batch.id
      }
    })

    // Upsert balance snapshot
    if (balance != null) {
      await prisma.accountBalance.upsert({
        where: { bankAccountId_date: { bankAccountId: bankAccount.id, date } },
        update: { balance },
        create: { bankAccountId: bankAccount.id, date, balance }
      })
    }

  // Categorization: simple fallback for now
  let categoryId = await ensureDefaultCategoryId()
  let propertyId = null
  let details = null
  let isTransfer = false

    await upsertUnifiedTransaction(prisma, tx, categoryId, propertyId, isTransfer, details)

    inserted += 1
  }

  // Finalize batch
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      transactionCount: inserted,
      status: 'COMPLETED'
    }
  })

  console.log(`✅ ${fileName}: ${inserted} transactions inserted (${startDate?.toISOString().slice(0,10)} → ${endDate?.toISOString().slice(0,10)})`)
}

async function main() {
  try {
    const root = path.resolve(__dirname, '..')
    const legacyDir = path.join(root, 'old_implementation')
    const candidates = fs.readdirSync(legacyDir).filter(f => f.endsWith('.csv'))

    // Filter only bank statement files (ignore DRE & Contas Unificadas)
    const files = candidates
      .filter(f => !f.includes('DRE') && !f.includes('Contas Unificadas'))
      .map(f => path.join(legacyDir, f))

    if (files.length === 0) {
      console.log('No CSV files found to import.')
      process.exit(0)
    }

    for (const filePath of files) {
      await importFile(filePath)
    }

    console.log('\n🎉 Import finished.')
  } catch (err) {
    console.error('Import failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
