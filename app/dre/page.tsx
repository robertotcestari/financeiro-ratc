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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">DRE - Demonstrativo do Resultado do Exercício</h1>
      </div>

      <DREFilters year={year} selectedMonths={selectedMonths} />
      
      <DRESummaryCards year={year} selectedMonths={selectedMonths} />
      
      <DRETable year={year} selectedMonths={selectedMonths} />
    </div>
  );
}