const fs = require('fs');

const csv = fs.readFileSync('prisma/seeder/Contratos de Locação - CC - Sicredi_no_balance.csv', 'utf-8');
const lines = csv.trim().split('\n').slice(1); // Remove header

let total = 0;
let count = 0;

lines.forEach(line => {
  if (!line.trim()) return;
  
  // Parse CSV line considering quotes
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length >= 4) {
    const valueStr = parts[3].replace(/"/g, '').replace(/\./g, '').replace(',', '.');
    const value = parseFloat(valueStr);
    if (!isNaN(value)) {
      total += value;
      count++;
    }
  }
});

console.log('CC Sicredi _no_balance:');
console.log('Total de transações:', count);
console.log('Soma total: R$', total.toLocaleString('pt-BR', {minimumFractionDigits: 2}));
console.log('Soma total (formato original): R$', total.toFixed(2));