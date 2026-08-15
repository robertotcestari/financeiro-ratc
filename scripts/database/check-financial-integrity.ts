import { createPrismaClient } from '@/lib/core/database/client';
import { PrismaClient } from '@/app/generated/prisma/client';

const prisma = createPrismaClient();

async function checkFinancialIntegrity() {
  console.log('🔍 Verificando integridade financeira...\n');

  try {
    // 1. Buscar soma total de todas as transações brutas por conta
    const transactionsByAccount = await prisma.transaction.groupBy({
      by: ['bankAccountId'],
      _sum: {
        amount: true
      }
    });

    // 2. Buscar informações das contas bancárias
    const bankAccounts = await prisma.bankAccount.findMany({
      select: {
        id: true,
        name: true,
        bankName: true
      }
    });

    // 3. Criar mapa de contas para facilitar lookup
    const accountMap = new Map(bankAccounts.map(acc => [acc.id, acc]));

    // 4. Calcular soma total de todas as transações
    let totalTransactions = 0;
    console.log('📊 Saldos por conta (baseado em transações):');
    console.log('─'.repeat(60));
    
    for (const accountSum of transactionsByAccount) {
      const account = accountMap.get(accountSum.bankAccountId);
      const sum = Number(accountSum._sum.amount || 0);
      totalTransactions += sum;
      
      console.log(
        `${account?.name?.padEnd(25)} | ${account?.bankName?.padEnd(10)} | R$ ${sum.toFixed(2).padStart(15)}`
      );
    }
    
    console.log('─'.repeat(60));
    console.log(`${'TOTAL TRANSAÇÕES'.padEnd(37)} | R$ ${totalTransactions.toFixed(2).padStart(15)}`);
    console.log();

    // 5. Buscar último saldo de cada conta (se houver AccountBalance)
    const latestBalances = await prisma.$queryRaw<Array<{
      bankAccountId: string;
      balance: number;
      date: Date;
    }>>`
      SELECT ab.bankAccountId, ab.balance, ab.date
      FROM account_balances ab
      INNER JOIN (
        SELECT bankAccountId, MAX(date) as maxDate
        FROM account_balances
        GROUP BY bankAccountId
      ) latest ON ab.bankAccountId = latest.bankAccountId AND ab.date = latest.maxDate
    `;

    if (latestBalances.length > 0) {
      let totalBalances = 0;
      console.log('💰 Últimos saldos registrados (AccountBalance):');
      console.log('─'.repeat(60));
      
      for (const balance of latestBalances) {
        const account = accountMap.get(balance.bankAccountId);
        const balanceValue = Number(balance.balance);
        totalBalances += balanceValue;
        
        console.log(
          `${account?.name?.padEnd(25)} | ${new Date(balance.date).toLocaleDateString('pt-BR').padEnd(10)} | R$ ${balanceValue.toFixed(2).padStart(15)}`
        );
      }
      
      console.log('─'.repeat(60));
      console.log(`${'TOTAL SALDOS'.padEnd(37)} | R$ ${totalBalances.toFixed(2).padStart(15)}`);
      console.log();

      // Comparação
      const difference = Math.abs(totalTransactions - totalBalances);
      const percentDiff = totalBalances !== 0 ? (difference / Math.abs(totalBalances) * 100) : 0;
      
      console.log('🔄 Comparação:');
      console.log('─'.repeat(60));
      console.log(`Total Transações: R$ ${totalTransactions.toFixed(2)}`);
      console.log(`Total Saldos:     R$ ${totalBalances.toFixed(2)}`);
      console.log(`Diferença:        R$ ${difference.toFixed(2)} (${percentDiff.toFixed(2)}%)`);
      
      if (difference < 0.01) {
        console.log('\n✅ Integridade OK: Os valores estão balanceados!');
      } else {
        console.log('\n⚠️  ATENÇÃO: Existe diferença entre transações e saldos!');
      }
    }

    // 6. Verificar transações unificadas
    const unifiedCount = await prisma.processedTransaction.count();
    const transactionCount = await prisma.transaction.count();
    
    console.log('\n📈 Estatísticas de categorização:');
    console.log('─'.repeat(60));
    console.log(`Total de transações brutas:      ${transactionCount}`);
    console.log(`Total de transações unificadas:  ${unifiedCount}`);
    console.log(`Transações não categorizadas:    ${transactionCount - unifiedCount}`);
    
    if (transactionCount > unifiedCount) {
      console.log('\n⚠️  Existem transações não categorizadas!');
    }

    // 7. Verificar transferências
    const transfers = await prisma.transfer.findMany({
      select: {
        amount: true,
        isComplete: true
      }
    });

    const completeTransfers = transfers.filter(t => t.isComplete);
    const incompleteTransfers = transfers.filter(t => !t.isComplete);
    const totalTransferAmount = transfers.reduce((sum, t) => sum + Number(t.amount), 0);

    console.log('\n🔄 Transferências entre contas:');
    console.log('─'.repeat(60));
    console.log(`Total de transferências:         ${transfers.length}`);
    console.log(`Transferências completas:        ${completeTransfers.length}`);
    console.log(`Transferências incompletas:      ${incompleteTransfers.length}`);
    console.log(`Valor total transferido:         R$ ${totalTransferAmount.toFixed(2)}`);

    // 8. Verificar integridade das transações unificadas
    const allUnified = await prisma.processedTransaction.findMany({
      select: {
        categoryId: true
      }
    });
    const unifiedWithoutCategory = allUnified.filter(u => !u.categoryId).length;

    if (unifiedWithoutCategory > 0) {
      console.log(`\n⚠️  ${unifiedWithoutCategory} transações unificadas sem categoria!`);
    }

    // 9. Análise por período (últimos 3 meses)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentTransactions = await prisma.transaction.groupBy({
      by: ['bankAccountId'],
      where: {
        date: {
          gte: threeMonthsAgo
        }
      },
      _sum: {
        amount: true
      },
      _count: true
    });

    console.log('\n📅 Movimentação últimos 3 meses:');
    console.log('─'.repeat(60));
    
    for (const recent of recentTransactions) {
      const account = accountMap.get(recent.bankAccountId);
      const sum = Number(recent._sum.amount || 0);
      
      console.log(
        `${account?.name?.padEnd(25)} | ${recent._count.toString().padEnd(5)} trans | R$ ${sum.toFixed(2).padStart(15)}`
      );
    }

  } catch (error) {
    console.error('❌ Erro ao verificar integridade:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar verificação
checkFinancialIntegrity().catch(console.error);