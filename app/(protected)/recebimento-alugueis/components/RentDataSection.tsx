import { getRentTransactions, getRentStats } from '../actions';
import RentSummaryCards from './RentSummaryCards';
import RentTable from './RentTable';
import ExportButton from './ExportButton';

interface RentDataSectionProps {
  month: number;
  year: number;
}

export default async function RentDataSection({ month, year }: RentDataSectionProps) {
  const [transactions, stats] = await Promise.all([
    getRentTransactions({ month, year }),
    getRentStats({ month, year })
  ]);

  return (
    <>
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
    </>
  );
}