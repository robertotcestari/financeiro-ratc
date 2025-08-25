import { Suspense } from 'react';
import RentFilters from './components/RentFilters';
import RentDataSection from './components/RentDataSection';
import RentDataSkeleton from './components/RentDataSkeleton';
import ImobziSection from './components/ImobziSection';
import ImobziPendingRentsSkeleton from './components/ImobziPendingRentsSkeleton';

interface SearchParams {
  mes?: string;
  ano?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function RecebimentoAlugueisPage({ searchParams }: Props) {
  const params = await searchParams;
  
  const currentDate = new Date();
  // Quando não há parâmetros, usa o mês anterior ao atual
  const previousMonth = currentDate.getMonth(); // getMonth() retorna 0-11, então já é o mês anterior
  const previousYear = previousMonth === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
  
  const month = params.mes ? parseInt(params.mes) : (previousMonth === 0 ? 12 : previousMonth);
  const year = params.ano ? parseInt(params.ano) : previousYear;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Recebimento de Aluguéis
          </h1>
          <p className="text-gray-600">
            Visualize todos os recebimentos de aluguel do período
          </p>
        </div>

        <div className="mb-6">
          <RentFilters 
            selectedMonth={month} 
            selectedYear={year} 
          />
        </div>

        <Suspense fallback={<RentDataSkeleton />}>
          <RentDataSection month={month} year={year} />
        </Suspense>

        <div className="mt-8">
          <Suspense fallback={<ImobziPendingRentsSkeleton />}>
            <ImobziSection month={month} year={year} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}