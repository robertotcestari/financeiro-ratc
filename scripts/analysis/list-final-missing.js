const fs = require('fs');
const csv = require('csv-parse/sync');

const csvContent = fs.readFileSync(
  'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs - Fixed.csv',
  'utf-8'
);

const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

const withoutId = records.filter(r => !r.TransactionId || r.TransactionId.trim() === '');

console.log(`Total de registros sem TransactionId: ${withoutId.length}\n`);
console.log('Registros sem TransactionId:');
console.log('============================\n');

withoutId.forEach((record, index) => {
  console.log(`${index + 1}. Linha ${records.indexOf(record) + 2}:`);
  console.log(`   Data: ${record.Data}`);
  console.log(`   Conta: ${record.Conta}`);
  console.log(`   Valor: ${record.Valor}`);
  console.log(`   Categoria: ${record.Categoria}`);
  console.log(`   Descrição: ${record['Descrição'] || '(vazio)'}`);
  console.log(`   Imóvel: ${record['Imóvel Referência'] || '-'}`);
  console.log(`   Detalhes: ${record.Detalhes || '-'}`);
  console.log('');
});

// Análise adicional
const byCategory = {};
withoutId.forEach(record => {
  const cat = record.Categoria;
  if (!byCategory[cat]) {
    byCategory[cat] = 0;
  }
  byCategory[cat]++;
});

console.log('Resumo por categoria:');
console.log('====================');
Object.entries(byCategory)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`${category}: ${count} registros`);
  });

const byAccount = {};
withoutId.forEach(record => {
  const account = record.Conta;
  if (!byAccount[account]) {
    byAccount[account] = 0;
  }
  byAccount[account]++;
});

console.log('\nResumo por conta:');
console.log('=================');
Object.entries(byAccount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([account, count]) => {
    console.log(`${account}: ${count} registros`);
  });