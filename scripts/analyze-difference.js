const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function analyzeDifference() {
  try {
    const totalTransactions = await prisma.transaction.count();
    const totalUnified = await prisma.unifiedTransaction.count();
    const totalCSVRecords = 3808; // Total do nosso CSV
    
    console.log('📊 Análise de totais:');
    console.log(`   Total Transactions na DB: ${totalTransactions}`);
    console.log(`   Total UnifiedTransactions na DB: ${totalUnified}`);
    console.log(`   Total registros no CSV: ${totalCSVRecords}`);
    console.log(`   Diferença Transactions vs Unified: ${totalTransactions - totalUnified}`);
    console.log(`   Diferença CSV vs Unified: ${totalCSVRecords - totalUnified}`);
    console.log('');

    // Verificar transações sem unified
    const transactionsWithoutUnified = await prisma.transaction.findMany({
      where: {
        unifiedTransaction: null
      },
      include: {
        bankAccount: true
      },
      take: 20,
      orderBy: {
        date: 'desc'
      }
    });

    console.log(`🔍 Transações sem UnifiedTransaction (${transactionsWithoutUnified.length} encontradas, mostrando primeiras 20):`);
    transactionsWithoutUnified.forEach((t, index) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      console.log(`   ${index + 1}. ${t.id.substring(0, 8)}... | ${date} | ${t.bankAccount.name} | R$ ${t.amount} | ${t.description.substring(0, 50)}...`);
    });
    console.log('');

    // Verificar se há duplicatas de transactionId nas unified
    const duplicateTransactionIds = await prisma.$queryRaw`
      SELECT transactionId, COUNT(*) as count 
      FROM unified_transactions 
      WHERE transactionId IS NOT NULL 
      GROUP BY transactionId 
      HAVING COUNT(*) > 1
    `;

    console.log(`🔄 UnifiedTransactions com transactionId duplicado: ${duplicateTransactionIds.length}`);
    if (duplicateTransactionIds.length > 0) {
      duplicateTransactionIds.slice(0, 5).forEach((dup, index) => {
        console.log(`   ${index + 1}. TransactionId: ${dup.transactionId.substring(0, 8)}... aparece ${dup.count} vezes`);
      });
    }
    console.log('');

    // Verificar transações por conta
    console.log('📈 Análise por conta bancária:');
    const accounts = await prisma.bankAccount.findMany();
    for (const account of accounts) {
      const transCount = await prisma.transaction.count({
        where: { bankAccountId: account.id }
      });
      
      // Para unified, vamos buscar tanto por transactionId quanto por conta (para os sem transactionId)
      const unifiedWithTransId = await prisma.unifiedTransaction.count({
        where: {
          transaction: {
            bankAccountId: account.id
          }
        }
      });

      console.log(`   ${account.name}: ${transCount} transactions vs ${unifiedWithTransId} unified (diff: ${transCount - unifiedWithTransId})`);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDifference();