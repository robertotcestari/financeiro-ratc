import { PrismaClient } from '../app/generated/prisma'
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()

interface ProcessedCSVRow {
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

async function analyzeMismatches() {
  console.log('🔍 ANÁLISE DE TRANSAÇÕES QUE NÃO FAZEM MATCH')
  console.log('===========================================')
  
  // 1. Load the unified CSV file
  const csvPath = path.join(__dirname, '../prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parse(csvContent, { 
    columns: ['year', 'month', 'propertyRef', 'category', 'account', 'details', 'date', 'description', 'value', 'categoryId'],
    skip_empty_lines: true,
    from_line: 2 // Skip header
  })

  console.log(`📄 CSV unificado: ${rows.length} linhas`)

  // 2. Get all existing transactions
  const transactions = await prisma.transaction.findMany({
    where: {
      balance: { not: null } // Only original transactions with balance
    },
    include: {
      bankAccount: true
    },
    orderBy: [
      { bankAccountId: 'asc' },
      { date: 'asc' },
      { amount: 'asc' }
    ]
  })

  console.log(`💳 Transações originais no banco: ${transactions.length}`)

  // 3. Get all transactions with balance = null (duplicates)
  const duplicateTransactions = await prisma.transaction.findMany({
    where: {
      balance: null
    },
    include: {
      bankAccount: true,
      unifiedTransaction: true
    },
    orderBy: [
      { date: 'desc' }
    ]
  })

  console.log(`🔄 Transações duplicadas (balance = null): ${duplicateTransactions.count}`)

  const bankAccounts = await prisma.bankAccount.findMany()
  const accountMap = new Map(bankAccounts.map(acc => [acc.name, acc.id]))

  let matchedCount = 0
  let unmatchedCount = 0
  const unmatchedEntries: any[] = []

  // 4. Analyze each CSV row for matching
  for (const row of rows) {
    const { year, month, propertyRef, category, account, details, date, description, value, categoryId } = row
    
    if (!account || !date || !value) {
      continue
    }

    const parsedValue = parseBRLNumber(value)
    const parsedDate = parseBRDate(date)
    
    if (!parsedValue || !parsedDate) {
      continue
    }

    const accountId = accountMap.get(account)
    if (!accountId) {
      continue
    }

    // Try to find matching transaction by account, date, and amount
    const matchingTransaction = transactions.find(tx => 
      tx.bankAccountId === accountId &&
      tx.date.toDateString() === parsedDate.toDateString() &&
      Math.abs(tx.amount - parsedValue) < 0.01
    )

    if (matchingTransaction) {
      matchedCount++
    } else {
      unmatchedCount++
      unmatchedEntries.push({
        account,
        date,
        amount: parsedValue,
        description,
        category,
        propertyRef: propertyRef || 'N/A'
      })
    }
  }

  console.log(`\n📊 RESULTADO DA ANÁLISE:`)
  console.log(`   ✅ Transações com match: ${matchedCount}`)
  console.log(`   ❓ Transações sem match: ${unmatchedCount}`)

  console.log(`\n❓ TRANSAÇÕES SEM MATCH PERFEITO:`)
  console.log('=' .repeat(80))

  // Group by account for better analysis
  const groupedByAccount = new Map()
  for (const entry of unmatchedEntries) {
    if (!groupedByAccount.has(entry.account)) {
      groupedByAccount.set(entry.account, [])
    }
    groupedByAccount.get(entry.account).push(entry)
  }

  for (const [account, entries] of groupedByAccount) {
    console.log(`\n🏦 ${account} (${entries.length} entradas sem match):`)
    console.log('-'.repeat(60))
    
    // Show first 10 entries for each account
    const entriesToShow = entries.slice(0, 10)
    for (const entry of entriesToShow) {
      console.log(`   📅 ${entry.date} | 💰 ${entry.amount} | 📝 ${entry.description.slice(0, 50)}${entry.description.length > 50 ? '...' : ''}`)
      if (entry.propertyRef !== 'N/A') {
        console.log(`      🏠 Propriedade: ${entry.propertyRef}`)
      }
      console.log(`      📂 Categoria: ${entry.category}`)
    }
    
    if (entries.length > 10) {
      console.log(`   ... e mais ${entries.length - 10} entradas`)
    }
  }

  // 5. Analyze patterns in unmatched entries
  console.log(`\n🔍 ANÁLISE DE PADRÕES NAS TRANSAÇÕES SEM MATCH:`)
  console.log('=' .repeat(60))

  // Check for date patterns
  const datesByYear = new Map()
  const categoriesCounts = new Map()
  
  for (const entry of unmatchedEntries) {
    const year = entry.date.split('/')[2]
    datesByYear.set(year, (datesByYear.get(year) || 0) + 1)
    categoriesCounts.set(entry.category, (categoriesCounts.get(entry.category) || 0) + 1)
  }

  console.log(`\n📅 Distribuição por ano:`)
  for (const [year, count] of [...datesByYear.entries()].sort()) {
    console.log(`   ${year}: ${count} transações`)
  }

  console.log(`\n📂 Top 10 categorias sem match:`)
  const sortedCategories = [...categoriesCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [category, count] of sortedCategories) {
    console.log(`   ${category}: ${count} transações`)
  }

  // 6. Check if these are manual entries or adjustments
  console.log(`\n💡 POSSÍVEIS CAUSAS:`)
  console.log(`   1. Transações manuais adicionadas ao CSV unificado`)
  console.log(`   2. Ajustes ou correções feitas posteriormente`)
  console.log(`   3. Diferenças de formatação de data/valor`)
  console.log(`   4. Transações que foram editadas manualmente`)

  console.log(`\n🔄 TRANSAÇÕES DUPLICADAS CRIADAS:`)
  console.log('-'.repeat(50))
  console.log(`   Total: ${duplicateTransactions.length}`)
  
  if (duplicateTransactions.length > 0) {
    console.log(`   Exemplos das duplicadas mais recentes:`)
    const recent = duplicateTransactions.slice(0, 5)
    for (const tx of recent) {
      console.log(`      💳 ${tx.bankAccount.name}: ${tx.amount} - ${tx.description.slice(0, 40)} (${tx.date.toISOString().slice(0, 10)})`)
      if (tx.unifiedTransaction) {
        console.log(`         🔗 Categoria: ${tx.unifiedTransaction.categoryId}`)
      }
    }
  }
}

analyzeMismatches()
  .catch(console.error)
  .finally(() => prisma.$disconnect())