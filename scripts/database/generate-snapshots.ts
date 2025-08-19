import { prisma } from '../lib/database/client';
import {
  generateAllSnapshots,
  createOrUpdateSnapshot,
} from '../lib/database/account-snapshots';
import { getSnapshotPerformanceStats } from '../lib/financial-calculations-optimized';

async function main() {
  console.log('🔄 Gerando snapshots mensais para todas as contas...\n');

  try {
    const startTime = Date.now();

    // Gera todos os snapshots
    const snapshots = await generateAllSnapshots();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ ${snapshots.length} snapshots gerados em ${duration}s\n`);

    // Agrupa por conta para exibir resumo
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    console.log('📊 Resumo por conta:\n');

    for (const account of accounts) {
      const stats = await getSnapshotPerformanceStats(account.id);
      const accountSnapshots = snapshots.filter(
        (s) => s.bankAccountId === account.id
      );

      console.log(`${account.name}:`);
      console.log(`  • Snapshots gerados: ${accountSnapshots.length}`);
      console.log(`  • Total de transações: ${stats.totalTransactions}`);

      if (accountSnapshots.length > 0) {
        const firstSnapshot = accountSnapshots[0];
        const lastSnapshot = accountSnapshots[accountSnapshots.length - 1];
        console.log(
          `  • Período: ${firstSnapshot.month}/${firstSnapshot.year} até ${lastSnapshot.month}/${lastSnapshot.year}`
        );
        console.log(
          `  • Saldo final: R$ ${lastSnapshot.closingBalance.toFixed(2)}`
        );
      }

      console.log(`  • Cobertura: ${stats.coveragePercentage}%\n`);
    }

    // Gera snapshot do mês atual se ainda não existir
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    console.log(
      `\n🔄 Atualizando snapshots do mês atual (${currentMonth}/${currentYear})...\n`
    );

    for (const account of accounts) {
      const snapshot = await createOrUpdateSnapshot(
        account.id,
        currentYear,
        currentMonth
      );
      console.log(
        `✅ ${account.name}: R$ ${snapshot.closingBalance.toFixed(2)}`
      );
    }

    console.log('\n✨ Processo concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao gerar snapshots:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Executa o script
main();
