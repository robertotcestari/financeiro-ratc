import { PrismaClient } from '@/app/generated/prisma'
import { nanoid } from 'nanoid'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

interface UnifiedCSVRow {
  year: string
  month: string
  propertyRef: string
  category: string
  account: string
  details: string
  date: string
  description: string
  value: string
  categoryId: string
}

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

async function linkTransactions() {
  console.log('🔗 Starting transaction linking process...')
  
  // 1. Load the unified CSV file
  const csvPath = path.join(__dirname, '../prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parse(csvContent, { 
    columns: ['year', 'month', 'propertyRef', 'category', 'account', 'details', 'date', 'description', 'value', 'categoryId'],
    skip_empty_lines: true,
    from_line: 2 // Skip header
  })

  console.log(`📄 Loaded ${rows.length} rows from CSV`)

  // 2. Get all existing transactions and unified transactions
  const transactions = await prisma.transaction.findMany({
    orderBy: [
      { bankAccountId: 'asc' },
      { date: 'asc' },
      { amount: 'asc' }
    ]
  })
  
  const bankAccounts = await prisma.bankAccount.findMany()
  const accountMap = new Map(bankAccounts.map(acc => [acc.name, acc.id]))

  console.log(`💳 Found ${transactions.length} existing transactions`)
  
  // 3. Create a new CSV with proper linking
  const outputRows: any[] = []
  const header = ['transactionId', 'year', 'month', 'propertyRef', 'category', 'account', 'details', 'date', 'description', 'value', 'categoryId']
  outputRows.push(header)

  let matchedCount = 0
  let unmatchedCount = 0

  for (const row of rows) {
    const { year, month, propertyRef, category, account, details, date, description, value, categoryId } = row
    
    if (!account || !date || !value) {
      console.log(`⚠️  Skipping invalid row: ${JSON.stringify(row)}`)
      continue
    }

    const parsedValue = parseBRLNumber(value)
    const parsedDate = parseBRDate(date)
    
    if (!parsedValue || !parsedDate) {
      console.log(`⚠️  Skipping row with invalid value/date: ${value}, ${date}`)
      continue
    }

    const accountId = accountMap.get(account)
    if (!accountId) {
      console.log(`⚠️  Unknown account: ${account}`)
      continue
    }

    // Try to find matching transaction by account, date, and amount
    const matchingTransaction = transactions.find(tx => 
      tx.bankAccountId === accountId &&
      tx.date.toDateString() === parsedDate.toDateString() &&
      Math.abs(tx.amount - parsedValue) < 0.01 // Allow for small floating point differences
    )

    if (matchingTransaction) {
      // Add row with transaction ID
      outputRows.push([
        matchingTransaction.id,
        year,
        month,
        propertyRef || '',
        category || '',
        account,
        details || '',
        date,
        description || '',
        value,
        categoryId || ''
      ])
      matchedCount++
    } else {
      // Create a new transaction ID for unmatched rows (could be manual entries)
      const newId = nanoid()
      outputRows.push([
        newId,
        year,
        month,
        propertyRef || '',
        category || '',
        account,
        details || '',
        date,
        description || '',
        value,
        categoryId || ''
      ])
      unmatchedCount++
      console.log(`❓ No matching transaction found for: ${account} ${date} ${value} - assigned new ID: ${newId}`)
    }
  }

  // 4. Write the new CSV file
  const outputPath = path.join(__dirname, '../prisma/seeder/Contratos de Locação - Unified Transactions - Linked.csv')
  const csvOutput = outputRows.map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  
  fs.writeFileSync(outputPath, csvOutput, 'utf-8')

  console.log('✅ Linking process completed!')
  console.log(`📊 Results:`)
  console.log(`   ✅ Matched transactions: ${matchedCount}`)
  console.log(`   ❓ Unmatched entries: ${unmatchedCount}`)
  console.log(`   📄 Output file: ${outputPath}`)
}

async function main() {
  try {
    await linkTransactions()
  } catch (error) {
    console.error('❌ Error during linking process:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()