import { PrismaClient } from '@/app/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

interface ProcessedTransactionRow {
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
  transactionId: string
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

export async function seedAllProcessedTransactions(prisma: PrismaClient) {
  console.log('🔗 Creating all processed transactions (with and without transactionId)...')
  
  const csvPath = path.join(__dirname, '../data', 'Contratos de Locação - Contas Unificadas - New Categories - With IDs - Fixed.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠️ CSV file not found, skipping...')
    return
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parse(csvContent, { 
    columns: ['year', 'month', 'propertyRef', 'category', 'account', 'details', 'date', 'description', 'value', 'categoryId', 'transactionId'],
    skip_empty_lines: true,
    from_line: 2 // Skip header
  }) as ProcessedTransactionRow[]

  // Get lookup maps
  const bankAccounts = await prisma.bankAccount.findMany()
  const accountMap = new Map(bankAccounts.map(acc => [acc.name, acc.id]))

  const categories = await prisma.category.findMany()  
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]))

  const properties = await prisma.property.findMany()
  const propertyMap = new Map(properties.map(prop => [prop.code, prop.id]))

  let created = 0
  let skipped = 0
  let withTransactionId = 0
  let withoutTransactionId = 0

  for (const row of rows) {
    const { transactionId, year, month, propertyRef, category, account, details, date, description, value, categoryId } = row
    
    if (!account || !date || !value || !categoryId) {
      console.log(`⚠️  Skipping row with missing required data: ${JSON.stringify({account, date, value, categoryId})}`)
      skipped++
      continue
    }

    const parsedValue = parseBRLNumber(value)
    const parsedDate = parseBRDate(date)
    const parsedYear = parseInt(year)
    const parsedMonth = parseInt(month)
    
    if (!parsedValue || !parsedDate || !parsedYear || !parsedMonth) {
      console.log(`⚠️  Skipping row with invalid data: ${value}, ${date}, ${year}, ${month}`)
      skipped++
      continue
    }

    const accountId = accountMap.get(account)
    if (!accountId) {
      console.log(`⚠️  Unknown account: ${account}`)
      skipped++
      continue
    }

    const categoryRecord = categoryMap.get(categoryId)
    if (!categoryRecord) {
      console.log(`⚠️  Unknown category: ${categoryId}`)
      skipped++
      continue
    }

    const propertyId = propertyRef && propertyRef !== '-' ? propertyMap.get(propertyRef) || null : null
    const hasTransactionId = transactionId && transactionId.trim() !== ''

    try {
      // If we have a transactionId, verify the transaction exists
      let canLinkTransaction = false
      if (hasTransactionId) {
        const existingTransaction = await prisma.transaction.findUnique({
          where: { id: transactionId }
        })
        
        if (!existingTransaction) {
          console.log(`⚠️  Transaction not found: ${transactionId}, creating ProcessedTransaction without link`)
        } else {
          canLinkTransaction = true
        }
      }

      // Check if ProcessedTransaction already exists for this transaction (if transactionId exists)
      let existingProcessed = null
      if (hasTransactionId) {
        existingProcessed = await prisma.processedTransaction.findUnique({
          where: { transactionId: transactionId }
        })
      }

      if (!existingProcessed) {
        // Create processed transaction
        await prisma.processedTransaction.create({
          data: {
            // Link to Transaction via relation when available
            ...(canLinkTransaction
              ? { transaction: { connect: { id: transactionId } } }
              : {}),
            year: parsedYear,
            month: parsedMonth,
            // Link category/property via relations
            category: { connect: { id: categoryId } },
            ...(propertyId ? { property: { connect: { id: propertyId } } } : {}),
            // Use details for any free-text notes/description
            details: (details || description) || null,
            isReviewed: true // Mark as reviewed since these come from manual categorization
          }
        })
        
        created++
        if (hasTransactionId) {
          withTransactionId++
          console.log(`✅ Created processed transaction with transactionId: ${transactionId}`)
        } else {
          withoutTransactionId++
          console.log(`📝 Created processed transaction without transactionId: ${date} - ${category}`)
        }
      } else {
        console.log(`🔄 ProcessedTransaction already exists for: ${transactionId}`)
      }

    } catch (error) {
      console.log(`❌ Error processing row: ${JSON.stringify({transactionId, date, category, account})}`)
      console.log(`   Error: ${error}`)
      skipped++
    }
  }

  console.log(`   ✅ Created ${created} processed transactions`)
  console.log(`   🔗 With transactionId: ${withTransactionId}`)
  console.log(`   📝 Without transactionId: ${withoutTransactionId}`)
  console.log(`   ⚠️  Skipped ${skipped} rows`)
}
