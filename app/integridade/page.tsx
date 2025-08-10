import { getFinancialIntegrityData } from './actions';
import { AccountBalancesTable } from './components/AccountBalancesTable';
import { IntegrityComparisonCard } from './components/IntegrityComparisonCard';
import { IntegrityStatsCard } from './components/IntegrityStatsCard';
import { TransferStatsCard } from './components/TransferStatsCard';
import { IntegrityFilters } from './components/IntegrityFilters';

interface PageProps {
  searchParams: { year?: string; month?: string };
}

export default async function IntegrityPage({ searchParams }: PageProps) {
  const year = searchParams.year ? parseInt(searchParams.year) : undefined;
  const month = searchParams.month ? parseInt(searchParams.month) : undefined;
  
  const data = await getFinancialIntegrityData(year, month);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 Integridade Financeira
        </h1>
        <p className="text-gray-600">
          Relatório de integridade e consistência dos dados financeiros
        </p>
      </div>

      {/* Filtros */}
      <IntegrityFilters />

      <div className="space-y-8">
        {/* Comparação de Integridade */}
        <IntegrityComparisonCard
          totalTransactions={data.totalTransactions}
          totalBalances={data.totalBalances}
          difference={data.difference}
          percentDiff={data.percentDiff}
          hasBalances={data.latestBalances.length > 0}
        />

        {/* Saldos por Transações */}
        <AccountBalancesTable
          balances={data.transactionsByAccount}
          total={data.totalTransactions}
          title="📊 Saldos por Conta (baseado em transações)"
        />


        {/* Estatísticas de Categorização */}
        <IntegrityStatsCard
          stats={data.integrityStats}
          unifiedWithoutCategory={data.unifiedWithoutCategory}
        />

        {/* Transferências */}
        <TransferStatsCard transferStats={data.transferStats} />
      </div>
    </div>
  );
}