const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkResults() {
  try {
    const totalUnified = await prisma.unifiedTransaction.count();
    const withTransactionId = await prisma.unifiedTransaction.count({
      where: {
        transactionId: {
          not: null
        }
      }
    });
    const withoutTransactionId = await prisma.unifiedTransaction.count({
      where: {
        transactionId: null
      }
    });

    console.log('📊 Resultados da importação:');
    console.log(`   Total UnifiedTransactions: ${totalUnified}`);
    console.log(`   Com transactionId: ${withTransactionId}`);
    console.log(`   Sem transactionId: ${withoutTransactionId}`);
    console.log('');
    
    // Mostrar alguns exemplos sem transactionId
    const samplesWithoutId = await prisma.unifiedTransaction.findMany({
      where: {
        transactionId: null
      },
      include: {
        category: true
      },
      take: 5
    });
    
    console.log('📝 Exemplos sem transactionId:');
    samplesWithoutId.forEach((ut, index) => {
      console.log(`   ${index + 1}. ${ut.year}/${ut.month.toString().padStart(2, '0')} - ${ut.category.name} - ${ut.details || ut.notes || '(sem descrição)'}`);
    });

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResults();