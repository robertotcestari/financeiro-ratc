import { PrismaClient } from '../../app/generated/prisma';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CSVTransaction {
  id: string;
  date: string;
  description: string;
  amount: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): Date {
  // Format: DD/MM/YYYY or D/M/YYYY
  const parts = dateStr.split('/');
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
}

function parseAmount(amountStr: string): number {
  // Remove quotes and convert Brazilian decimal format (1.234,56) to number
  const cleaned = amountStr.replace(/"/g, '').replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
}

async function getBankAccountByName(name: string) {
  return await prisma.bankAccount.findUnique({
    where: { name }
  });
}

async function importCSVFile(filePath: string, bankAccountName: string) {
  console.log(`\nImporting: ${path.basename(filePath)}`);
  
  const bankAccount = await getBankAccountByName(bankAccountName);
  if (!bankAccount) {
    console.log(`  ❌ Bank account "${bankAccountName}" not found`);
    return 0;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length <= 1) {
    console.log('  ⚠️  No data rows found');
    return 0;
  }
  
  // Skip header line
  const dataLines = lines.slice(1);
  let imported = 0;
  let skipped = 0;
  
  for (const line of dataLines) {
    if (!line.trim()) continue;
    
    try {
      const fields = parseCSVLine(line);
      if (fields.length < 4) {
        console.log(`  ⚠️  Skipping invalid line: ${line.substring(0, 50)}...`);
        continue;
      }
      
      const transaction: CSVTransaction = {
        id: fields[0],
        date: fields[1],
        description: fields[2],
        amount: fields[3]
      };
      
      // Check if transaction already exists by ID
      const existing = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Parse and validate data
      const date = parseDate(transaction.date);
      const amount = parseAmount(transaction.amount);
      const description = transaction.description || 'Sem descrição';
      
      // Create transaction with custom ID
      await prisma.transaction.create({
        data: {
          id: transaction.id, // Use nanoid from CSV
          bankAccountId: bankAccount.id,
          date,
          description,
          amount,
          balance: null, // No balance column in _no_balance files
          ofxTransId: null,
          ofxAccountId: null,
          importBatchId: null,
          isDuplicate: false
        }
      });
      
      imported++;
      
    } catch (error) {
      console.log(`  ❌ Error processing line: ${line.substring(0, 50)}...`);
      console.log(`     Error: ${error.message}`);
    }
  }
  
  console.log(`  ✅ Imported: ${imported} transactions`);
  if (skipped > 0) {
    console.log(`  ⏭️  Skipped: ${skipped} existing transactions`);
  }
  
  return imported;
}

export async function seedCSVTransactions() {
  console.log('🏦 Seeding CSV Transactions with Custom IDs...');
  
  const csvFiles = [
    {
      file: 'Contratos de Locação - CC - PJBank_no_balance.csv',
      bankAccount: 'CC - PJBank'
    },
    {
      file: 'Contratos de Locação - CC - Sicredi_no_balance.csv',
      bankAccount: 'CC - Sicredi'
    },
    {
      file: 'Contratos de Locação - CI - XP_no_balance.csv',
      bankAccount: 'CI - XP'
    },
    {
      file: 'Contratos de Locação - CI - SicrediInvest_no_balance.csv',
      bankAccount: 'CI - SicrediInvest'
    }
  ];
  
  let totalImported = 0;
  
  for (const { file, bankAccount } of csvFiles) {
    const filePath = path.join(__dirname, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${file}`);
      continue;
    }
    
    try {
      const imported = await importCSVFile(filePath, bankAccount);
      totalImported += imported;
    } catch (error) {
      console.log(`  ❌ Failed to import ${file}: ${error.message}`);
    }
  }
  
  console.log(`\n✅ CSV Transaction seeding completed! Total imported: ${totalImported}`);
  return totalImported;
}

// Run directly if this file is executed
if (require.main === module) {
  seedCSVTransactions()
    .then(() => {
      console.log('✅ Seeding completed!');
      prisma.$disconnect();
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      prisma.$disconnect();
      process.exit(1);
    });
}