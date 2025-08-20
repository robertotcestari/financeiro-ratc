import { getFinancialIntegrityData } from '../actions';
import { IntegrityComparisonCard } from './IntegrityComparisonCard';
import { TransferStatsCard } from './TransferStatsCard';
import { UnprocessedTransactionsCard } from './UncategorizedTransactionsCard';
import { AccountBalanceComparisonCard } from './AccountBalanceComparisonCard';

interface IntegrityDataProps {
  year?: number;
  month?: number;
}

export async function IntegrityData({ year, month }: IntegrityDataProps) {
  const data = await getFinancialIntegrityData(year, month);

  return (
    <div className="space-y-8">
      {/* Comparação de Integridade */}
      <IntegrityComparisonCard
        totalTransactions={data.totalTransactions}
        integrityStats={data.integrityStats}
      />

      {/* Transferências */}
      <TransferStatsCard transferStats={data.transferStats} />

      {/* Comparação de Saldos por Conta */}
      <AccountBalanceComparisonCard 
        accountBalanceComparisons={data.accountBalanceComparisons}
      />

      {/* Transações Não Processadas */}
      <UnprocessedTransactionsCard 
        unprocessedTransactions={data.unprocessedTransactions}
        totalUnprocessed={data.integrityStats.unprocessedCount}
      />
    </div>
  );
}