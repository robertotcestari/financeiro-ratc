const { PrismaClient } = require('../app/generated/prisma');
const prisma = new PrismaClient();

async function checkTransaction() {
  try {
    // Buscar a transação específica
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: 'ki2vjf5xy61saamkoza5y9a0'
      },
      include: {
        bankAccount: true
      }
    });

    if (transaction) {
      console.log('Transação encontrada:');
      console.log('ID:', transaction.id);
      console.log('Data:', transaction.date);
      console.log('Valor:', transaction.amount.toString());
      console.log('Descrição:', transaction.description);
      console.log('Conta:', transaction.bankAccount.name);
      console.log('');
      
      // Formatar a data para comparação
      const date = new Date(transaction.date);
      const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      console.log('Data formatada:', dateStr);
      
      // Verificar se há diferenças
      console.log('\nComparando com o CSV:');
      console.log('CSV Data: 22/11/2024');
      console.log('CSV Valor: -8.855,80');
      console.log('CSV Conta: CC - Sicredi');
      console.log('CSV Descrição: PAGAMENTO PIX - PIX_DEB 60746948000112 Banco Bradesco SA');
      
      console.log('\nDiferenças:');
      if (dateStr !== '22/11/2024') {
        console.log(`- Data diferente: ${dateStr} vs 22/11/2024`);
      }
      if (transaction.amount.toString() !== '-8855.80') {
        console.log(`- Valor diferente: ${transaction.amount.toString()} vs -8855.80`);
      }
      if (transaction.bankAccount.name !== 'CC - Sicredi') {
        console.log(`- Conta diferente: ${transaction.bankAccount.name} vs CC - Sicredi`);
      }
      
      // Buscar outras transações próximas
      console.log('\n\nBuscando transações similares em 22/11/2024:');
      const startDate = new Date(2024, 10, 22); // 22/11/2024
      const endDate = new Date(2024, 10, 23);   // 23/11/2024
      
      const similarTransactions = await prisma.transaction.findMany({
        where: {
          date: {
            gte: startDate,
            lt: endDate
          },
          bankAccount: {
            name: 'CC - Sicredi'
          }
        },
        include: {
          bankAccount: true
        },
        orderBy: {
          amount: 'asc'
        }
      });
      
      console.log(`Encontradas ${similarTransactions.length} transações em 22/11/2024 na conta CC - Sicredi:`);
      similarTransactions.forEach(t => {
        console.log(`- ID: ${t.id} | Valor: ${t.amount.toString()} | Descrição: ${t.description.substring(0, 50)}...`);
      });
      
    } else {
      console.log('Transação não encontrada com ID:', 'ki2vjf5xy61saamkoza5y9a0');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransaction();