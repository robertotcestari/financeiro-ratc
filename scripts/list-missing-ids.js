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

console.log(`Total de registros sem TransactionId: ${withoutId.length}\n`);
console.log('Primeiras 30 entradas sem TransactionId:');
console.log('=========================================\n');

withoutId.slice(0, 30).forEach((record, index) => {
  console.log(`${index + 1}. Data: ${record.Data}, Conta: ${record.Conta}, Valor: ${record.Valor}`);
  console.log(`   Categoria: ${record.Categoria}`);
  console.log(`   Descrição: ${record['Descrição'] || '(vazio)'}`);
  console.log(`   Imóvel: ${record['Imóvel Referência'] || '-'}`);
  console.log('');
});