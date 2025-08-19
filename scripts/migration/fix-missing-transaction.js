const { PrismaClient } = require('../app/generated/prisma');
const fs = require('fs');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const prisma = new PrismaClient();

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

function parseAmount(amountStr) {
  if (!amountStr) return null;
  // Remove quotes and replace comma with dot
  const cleanAmount = amountStr
    .replace(/"/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanAmount);
}

async function fixMissingTransaction() {
  try {
    // Read CSV file
    const csvContent = fs.readFileSync(
      'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs.csv',
      'utf-8'
    );

    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    // Find the specific record at line 2716
    const targetRecord = records.find(r => 
      r.Data === '22/11/2024' && 
      r.Conta === 'CC - Sicredi' && 
      r.Valor === '-8.855,80'
    );

    if (targetRecord) {
      console.log('Registro encontrado no CSV:');
      console.log('Linha:', records.indexOf(targetRecord) + 2); // +2 for header and 0-index
      console.log('Data:', targetRecord.Data);
      console.log('Valor:', targetRecord.Valor);
      console.log('TransactionId atual:', targetRecord.TransactionId || '(vazio)');
      
      // Update the TransactionId
      targetRecord.TransactionId = 'ki2vjf5xy61saamkoza5y9a0';
      console.log('\nTransactionId atualizado para:', targetRecord.TransactionId);
      
      // Also check for other transactions with precision issues
      console.log('\nVerificando outras transações com problemas de precisão decimal...');
      
      let updatedCount = 1; // We already updated one
      
      for (const record of records) {
        if (!record.TransactionId || record.TransactionId.trim() === '') {
          const date = parseDate(record.Data);
          const amount = parseAmount(record.Valor);
          
          if (date && amount) {
            // Search with decimal precision tolerance
            const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
            
            const transaction = await prisma.transaction.findFirst({
              where: {
                bankAccount: {
                  name: record.Conta
                },
                date: {
                  gte: startDate,
                  lt: endDate
                },
                amount: {
                  gte: amount - 0.01,
                  lte: amount + 0.01
                }
              }
            });
            
            if (transaction) {
              record.TransactionId = transaction.id;
              updatedCount++;
              console.log(`Encontrada: ${record.Data} | ${record.Conta} | ${record.Valor} -> ${transaction.id}`);
            }
          }
        }
      }
      
      console.log(`\nTotal de registros atualizados: ${updatedCount}`);
      
      // Write updated CSV
      const columns = Object.keys(records[0]);
      const output = stringify(records, {
        header: true,
        columns: columns
      });

      fs.writeFileSync(
        'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs - Fixed.csv',
        output
      );

      console.log('\nArquivo atualizado salvo como: Contratos de Locação - Contas Unificadas - New Categories - With IDs - Fixed.csv');
      
    } else {
      console.log('Registro não encontrado no CSV');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixMissingTransaction();