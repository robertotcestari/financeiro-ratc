import { PrismaClient } from '@/app/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'

interface ProcessedTransactionRow {
  year: string
  month: string
  property: string
  category: string
  account: string
  details: string
  date: string
  description: string
  value: string
  categoryId: string
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

function parseValue(value: string): number {
  // Remove quotes and convert comma decimal to dot
  const cleanValue = value.replace(/"/g, '').replace('.', '').replace(',', '.')
  return parseFloat(cleanValue) || 0
}

function parseDate(dateStr: string): Date {
  // Parse DD/MM/YYYY format
  const [day, month, year] = dateStr.split('/')
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
}

export async function seedProcessedTransactions(prisma: PrismaClient) {
  console.log('🔗 Creating processed transactions...')
  
  const csvPath = path.join(__dirname, '../data', 'Contratos de Locação - Contas Unificadas - New Categories.csv')
  
  if (!fs.existsSync(csvPath)) {
    console.log('   ⚠️ Processed transactions CSV not found, skipping...')
    return
  }
  
  const data = fs.readFileSync(csvPath, 'utf-8')
  const lines = data.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) {
    console.log('   ⚠️ No data in processed transactions CSV')
    return
  }
  
  // Skip header
  const dataLines = lines.slice(1)
  let created = 0
  let skipped = 0
  
  // Get bank account mappings
  const bankAccounts = await prisma.bankAccount.findMany()
  const accountMap = new Map(bankAccounts.map(acc => [acc.name, acc.id]))
  
  // Get property mappings (if any exist)
  const properties = await prisma.property.findMany()
  const propertyMap = new Map(properties.map(prop => [prop.name, prop.id]))
  
  for (const line of dataLines) {
    try {
      const row = parseCSVLine(line)
      
      if (row.length < 10) {
        skipped++
        continue
      }
      
      const [year, month, propertyRef, category, account, details, date, description, value, categoryId] = row
      
      if (!categoryId || !accountMap.has(account)) {
        skipped++
        continue
      }
      
      const parsedValue = parseValue(value)
      const parsedDate = parseDate(date)
      
      await prisma.processedTransaction.create({
        data: {
          bankAccountId: accountMap.get(account)!,
          categoryId: categoryId,
          propertyId: propertyRef && propertyRef !== '-' ? propertyMap.get(propertyRef) || null : null,
          date: parsedDate,
          description: description || category,
          details: details || null,
          amount: parsedValue,
          year: parseInt(year),
          month: parseInt(month),
          originalCategory: category,
        }
      })
      
      created++
      
    } catch (error) {
      console.error(`Error processing line: ${line}`, error)
      skipped++
    }
  }
  
  console.log(`   ✅ Created ${created} processed transactions (${skipped} skipped)`)
}