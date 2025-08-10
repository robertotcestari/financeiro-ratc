import { DRETable } from './components/DRETable';
import { DREFilters } from './components/DREFilters';
import { DRESummaryCards } from './components/DRESummaryCards';

export default async function DREPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; months?: string }>;
}) {
  const currentYear = new Date().getFullYear();
  const params = await searchParams;
  const year = params.year ? parseInt(params.year) : currentYear;
  const monthsParam = params.months || '';
  const selectedMonths = monthsParam
    ? monthsParam.split(',').map(Number).filter(m => m >= 1 && m <= 12)
    : Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">DRE - Demonstrativo do Resultado do Exercício</h1>
        </div>

        <div className="space-y-6">
          <DREFilters year={year} selectedMonths={selectedMonths} />
          
          <DRESummaryCards year={year} selectedMonths={selectedMonths} />
          
          <DRETable year={year} selectedMonths={selectedMonths} />
        </div>
      </div>
    </div>
  );
}