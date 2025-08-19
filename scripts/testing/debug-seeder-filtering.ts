import * as fs from 'fs'
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

const csvPath = 'prisma/seeder/Contratos de Locação - CC - Sicredi.csv'
const content = fs.readFileSync(csvPath, 'utf8')
const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  delimiter: ',',
  bom: true,
  trim: true
})

console.log('=== SEEDER FILTERING DEBUG ===')
console.log(`Total CSV records: ${records.length}`)

let processed = 0
let skippedNoDate = 0
let skippedInitialBalance = 0
let sumIncluded = 0
let sumSkipped = 0

for (const row of records) {
  const dateStr = row['Data']
  const desc = row['Descrição'] ?? row['MEMO'] ?? ''
  const valorStr = row['Valor']

  const date = parseBRDate(dateStr)
  if (!date) {
    skippedNoDate++
    console.log(`SKIPPED (no date): ${dateStr} - ${valorStr} - ${desc}`)
    continue
  }

  const amount = parseBRLNumber(valorStr)
  
  const descLower = String(desc || '').toLowerCase()
  if ((descLower.includes('saldo inicial') || descLower.includes('saldo anterior')) && (amount === 0 || amount === null)) {
    skippedInitialBalance++
    sumSkipped += amount || 0
    console.log(`SKIPPED (initial balance with zero): ${dateStr} - ${valorStr} - ${desc}`)
    continue
  }

  processed++
  sumIncluded += amount || 0
}

console.log(`\nSummary:`)
console.log(`  Total CSV records: ${records.length}`)
console.log(`  Processed: ${processed}`)
console.log(`  Skipped (no date): ${skippedNoDate}`)
console.log(`  Skipped (initial balance zero): ${skippedInitialBalance}`)
console.log(`  Sum of included: R$ ${sumIncluded.toFixed(2)}`)
console.log(`  Sum of skipped: R$ ${sumSkipped.toFixed(2)}`)
console.log(`  Expected database count: ${processed}`)
console.log(`  Actual database count: 2200`)
console.log(`  Missing: ${processed - 2200}`)