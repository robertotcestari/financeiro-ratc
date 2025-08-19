import * as fs from 'fs'
import { parse } from 'csv-parse/sync'

function parseBRLNumber(text: any): number | null {
  if (text === undefined || text === null) return null
  const s = String(text).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

// Test the parsing function
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

console.log('=== PARSING DEBUG ===')
console.log(`Total records: ${records.length}`)

let sum = 0
let errorCount = 0

console.log('\nFirst 10 records:')
for (let i = 0; i < Math.min(10, records.length); i++) {
  const row = records[i]
  const valorStr = row['Valor']
  const parsed = parseBRLNumber(valorStr)
  
  console.log(`Row ${i+1}:`)
  console.log(`  Raw value: "${valorStr}"`)
  console.log(`  Parsed: ${parsed}`)
  console.log(`  Date: ${row['Data']}`)
  console.log(`  Description: ${row['Descrição']?.slice(0, 50)}...`)
  console.log(`  ---`)
  
  if (parsed !== null) {
    sum += parsed
  } else {
    errorCount++
  }
}

// Sum all values
let totalSum = 0
for (const row of records) {
  const parsed = parseBRLNumber(row['Valor'])
  if (parsed !== null) {
    totalSum += parsed
  }
}

console.log(`\nTotal sum from parsing: R$ ${totalSum.toFixed(2)}`)
console.log(`Expected: R$ 1.00`)
console.log(`Parsing errors: ${errorCount}`)

// Check last few records too
console.log('\nLast 5 records:')
const lastRecords = records.slice(-5)
for (let i = 0; i < lastRecords.length; i++) {
  const row = lastRecords[i]
  const valorStr = row['Valor']
  const parsed = parseBRLNumber(valorStr)
  
  console.log(`Last ${i+1}:`)
  console.log(`  Raw value: "${valorStr}"`)
  console.log(`  Parsed: ${parsed}`)
  console.log(`  Date: ${row['Data']}`)
}