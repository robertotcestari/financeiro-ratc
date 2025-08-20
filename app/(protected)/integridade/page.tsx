import { Suspense } from 'react';
import { IntegrityFilters } from './components/IntegrityFilters';
import { CalculateBalancesButton } from './components/CalculateBalancesButton';
import { IntegrityData } from './components/IntegrityData';
import { IntegrityDataSkeleton } from './components/IntegrityDataSkeleton';
import { Search } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function IntegrityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const year = params.year ? parseInt(params.year) : undefined;
  const month = params.month ? parseInt(params.month) : undefined;
  
  // Create a unique key based on search params to reset Suspense boundary
  const suspenseKey = `${year || 'all'}-${month || 'all'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Integridade Financeira
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

        <Suspense key={suspenseKey} fallback={<IntegrityDataSkeleton />}>
          <IntegrityData year={year} month={month} />
        </Suspense>
      </div>
    </div>
  );
}