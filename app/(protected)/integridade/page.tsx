import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { IntegrityFilters } from './components/IntegrityFilters';
import { CalculateBalancesButton } from './components/CalculateBalancesButton';
import { IntegrityData } from './components/IntegrityData';
import { IntegrityDataSkeleton } from './components/IntegrityDataSkeleton';
import { Search } from 'lucide-react';
import { requirePermissions } from '@/lib/core/auth/permission-helpers';
import { REPORT_VIEW_PERMISSION } from '@/lib/core/auth/permissions';

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function IntegrityPage({ searchParams }: PageProps) {
  await requirePermissions(REPORT_VIEW_PERMISSION);
  const params = await searchParams;

  // Set default values when no parameters are provided
  if (!params.year && !params.month) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

    // Previous month logic
    let defaultYear = currentYear;
    let defaultMonth = currentMonth - 1;

    // If current month is January (1), previous month should be December of previous year
    if (defaultMonth === 0) {
      defaultMonth = 12;
      defaultYear = currentYear - 1;
    }

    redirect(`/integridade?year=${defaultYear}&month=${defaultMonth}`);
  }

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
