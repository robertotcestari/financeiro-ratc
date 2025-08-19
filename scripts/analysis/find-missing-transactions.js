const { PrismaClient } = require('../app/generated/prisma');
const fs = require('fs');
const csv = require('csv-parse/sync');

const prisma = new PrismaClient();

async function findMissingTransactions() {
  try {
    // Ler o CSV para saber quais transactionIds foram processados
    const csvContent = fs.readFileSync(
      'prisma/seeder/Contratos de Locação - Contas Unificadas - New Categories - With IDs - Fixed.csv',
      'utf-8'
    );

    const csvRows = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });

    // Extrair todos os transactionIds do CSV (exceto os vazios)
    const csvTransactionIds = new Set();
    csvRows.forEach(row => {
      if (row.TransactionId && row.TransactionId.trim() !== '') {
        csvTransactionIds.add(row.TransactionId);
      }
    });

    console.log(`📄 CSV contém ${csvTransactionIds.size} transactionIds únicos`);

    // Buscar todas as transações da DB
    const allTransactions = await prisma.transaction.findMany({
      include: {
        bankAccount: true,
        unifiedTransaction: true
      }
    });

    console.log(`💾 Database contém ${allTransactions.length} transações`);

    // Encontrar transações que não estão no CSV
    const missingFromCSV = allTransactions.filter(t => !csvTransactionIds.has(t.id));
    console.log(`❓ Transações na DB mas não no CSV: ${missingFromCSV.length}`);

    // Encontrar transações que não têm UnifiedTransaction
    const withoutUnified = allTransactions.filter(t => !t.unifiedTransaction);
    console.log(`🚫 Transações sem UnifiedTransaction: ${withoutUnified.length}`);

    // Analisar as transações mais recentes sem unified (podem ser novas)
    const recentWithoutUnified = withoutUnified
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    console.log('\n📅 Transações recentes sem UnifiedTransaction (top 10):');
    recentWithoutUnified.forEach((t, index) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      console.log(`   ${index + 1}. ${date} | ${t.bankAccount.name} | R$ ${t.amount} | ${t.description.substring(0, 60)}...`);
    });

    // Verificar se são transações importadas após o CSV
    const csvMaxDate = Math.max(...csvRows.map(row => {
      const [d, m, y] = row.Data.split('/');
      return new Date(y, m - 1, d).getTime();
    }));

    const csvMaxDateFormatted = new Date(csvMaxDate).toLocaleDateString('pt-BR');
    console.log(`\n📅 Data mais recente no CSV: ${csvMaxDateFormatted}`);

    const transactionsAfterCSV = withoutUnified.filter(t => 
      new Date(t.date).getTime() > csvMaxDate
    );

    console.log(`⏰ Transações após a data do CSV: ${transactionsAfterCSV.length}`);

    // Analisar por período
    const currentYear = new Date().getFullYear();
    const byYear = {};
    
    withoutUnified.forEach(t => {
      const year = new Date(t.date).getFullYear();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    console.log('\n📊 Transações sem Unified por ano:');
    Object.entries(byYear)
      .sort()
      .forEach(([year, count]) => {
        console.log(`   ${year}: ${count} transações`);
      });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findMissingTransactions();