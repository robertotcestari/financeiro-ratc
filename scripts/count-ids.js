const fs = require('fs');
const csv = require('csv-parse/sync');

const csvContent = fs.readFileSync(
  'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs.csv',
  'utf-8'
);

const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

const withId = records.filter(r => r.TransactionId && r.TransactionId.trim() !== '').length;
const withoutId = records.filter(r => !r.TransactionId || r.TransactionId.trim() === '').length;

console.log(`Total de registros: ${records.length}`);
console.log(`Com TransactionId: ${withId}`);
console.log(`Sem TransactionId: ${withoutId}`);
console.log(`Percentual encontrado: ${((withId / records.length) * 100).toFixed(2)}%`);