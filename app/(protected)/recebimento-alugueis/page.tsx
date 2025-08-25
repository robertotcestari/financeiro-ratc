import { getRentTransactions, getRentStats, getImobziPendingRents } from './actions';
import RentFilters from './components/RentFilters';
import RentSummaryCards from './components/RentSummaryCards';
import RentTable from './components/RentTable';
import ExportButton from './components/ExportButton';
import ImobziPendingRents from './components/ImobziPendingRents';

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
  const month = params.mes ? parseInt(params.mes) : currentDate.getMonth() + 1;
  const year = params.ano ? parseInt(params.ano) : currentDate.getFullYear();

  const [transactions, stats, imobziInvoices] = await Promise.all([
    getRentTransactions({ month, year }),
    getRentStats({ month, year }),
    getImobziPendingRents({ month, year })
  ]);

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

        <div className="mb-6">
          <RentSummaryCards stats={stats} />
        </div>

        <div className="mb-4 flex justify-end">
          <ExportButton 
            transactions={transactions}
            month={month}
            year={year}
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <RentTable transactions={transactions} />
        </div>

        <div className="mt-8">
          <ImobziPendingRents invoices={imobziInvoices} />
        </div>
      </div>
    </div>
  );
}