const { PrismaClient } = require('../app/generated/prisma');
const fs = require('fs');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const prisma = new PrismaClient();

// Map account names to their IDs in the database
const accountMapping = {
  'CC - Sicredi': null,
  'CC - PJBank': null,
  'CI - XP': null,
  'CI - SicrediInvest': null
};

async function loadAccountMapping() {
  const accounts = await prisma.bankAccount.findMany();
  accounts.forEach(account => {
    accountMapping[account.name] = account.id;
  });
  console.log('Account mapping loaded:', accountMapping);
}

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

async function findTransactionId(row) {
  const date = parseDate(row['Data']);
  const amount = parseAmount(row['Valor']);
  const bankAccountId = accountMapping[row['Conta']];
  
  if (!date || !amount || !bankAccountId) {
    console.log(`Skipping row - missing data: date=${date}, amount=${amount}, account=${row['Conta']}`);
    return null;
  }

  // Search for transaction with matching date, amount, and account
  const transaction = await prisma.transaction.findFirst({
    where: {
      bankAccountId: bankAccountId,
      date: {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
      },
      amount: amount
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (transaction) {
    console.log(`Found transaction: ${transaction.id} for ${row['Data']} ${row['Conta']} ${row['Valor']}`);
    return transaction.id;
  } else {
    console.log(`Transaction not found for: ${row['Data']} ${row['Conta']} ${row['Valor']}`);
    return null;
  }
}

async function main() {
  try {
    await loadAccountMapping();

    // Read CSV file
    const csvContent = fs.readFileSync(
      'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories.csv',
      'utf-8'
    );

    const records = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Processing ${records.length} records...`);

    // Add transactionId to each record
    const updatedRecords = [];
    for (const record of records) {
      const transactionId = await findTransactionId(record);
      updatedRecords.push({
        ...record,
        TransactionId: transactionId || ''
      });
    }

    // Write updated CSV
    const columns = [...Object.keys(records[0]), 'TransactionId'];
    const output = stringify(updatedRecords, {
      header: true,
      columns: columns
    });

    fs.writeFileSync(
      'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs.csv',
      output
    );

    console.log('Updated CSV saved to: Contratos de Locação - Contas Unificadas - New Categories - With IDs.csv');

    // Also show summary
    const foundCount = updatedRecords.filter(r => r.TransactionId).length;
    const notFoundCount = updatedRecords.filter(r => !r.TransactionId).length;
    console.log(`\nSummary:`);
    console.log(`- Total records: ${updatedRecords.length}`);
    console.log(`- Found transactions: ${foundCount}`);
    console.log(`- Not found: ${notFoundCount}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();