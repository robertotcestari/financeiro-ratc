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

const withoutId = records.filter(r => !r.TransactionId || r.TransactionId.trim() === '');

// Agrupar por categoria
const byCategory = {};
withoutId.forEach(record => {
  const cat = record.Categoria;
  if (!byCategory[cat]) {
    byCategory[cat] = [];
  }
  byCategory[cat].push(record);
});

console.log('Registros sem TransactionId agrupados por categoria:');
console.log('====================================================\n');

Object.entries(byCategory)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([category, records]) => {
    console.log(`${category}: ${records.length} registros`);
    
    // Mostrar os primeiros 3 exemplos
    records.slice(0, 3).forEach(r => {
      console.log(`  - ${r.Data} | ${r.Conta} | R$ ${r.Valor}`);
    });
    
    if (records.length > 3) {
      console.log(`  ... e mais ${records.length - 3} registros`);
    }
    console.log('');
  });

// Agrupar por conta
const byAccount = {};
withoutId.forEach(record => {
  const account = record.Conta;
  if (!byAccount[account]) {
    byAccount[account] = 0;
  }
  byAccount[account]++;
});

console.log('\nPor conta bancária:');
console.log('===================');
Object.entries(byAccount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([account, count]) => {
    console.log(`${account}: ${count} registros`);
  });