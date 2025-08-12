import { redirect } from 'next/navigation';
import { getFinancialIntegrityData } from './actions';
import { AccountBalancesTable } from './components/AccountBalancesTable';
import { IntegrityComparisonCard } from './components/IntegrityComparisonCard';
import { IntegrityStatsCard } from './components/IntegrityStatsCard';
import { TransferStatsCard } from './components/TransferStatsCard';
import { IntegrityFilters } from './components/IntegrityFilters';
import { UnprocessedTransactionsCard } from './components/UncategorizedTransactionsCard';
import { AccountBalanceComparisonCard } from './components/AccountBalanceComparisonCard';
import { CalculateBalancesButton } from './components/CalculateBalancesButton';

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function IntegrityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Redirecionamento removido - permite visualizar todos os anos quando não há filtros
  
  const year = params.year ? parseInt(params.year) : undefined;
  const month = params.month ? parseInt(params.month) : undefined;
  
  const data = await getFinancialIntegrityData(year, month);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔍 Integridade Financeira
        </h1>
        <p className="text-gray-600">
          Relatório de integridade e consistência dos dados financeiros
        </p>
      </div>

      {/* Filtros e Ações */}
      <div className="flex justify-between items-center mb-6">
        <IntegrityFilters />
        <CalculateBalancesButton />
      </div>

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
      </div>
    </div>
  );
}