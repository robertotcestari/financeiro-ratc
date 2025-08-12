import { generateMonthlyDRE } from '../actions';
import { DRETableClient } from './DRETableClient';

interface DRETableProps {
  year: number;
  selectedMonths: number[];
}

export async function DRETable({ year, selectedMonths }: DRETableProps) {
  if (selectedMonths.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Selecione ao menos um mês para visualizar o DRE</p>
      </div>
    );
  }

  const { rows } = await generateMonthlyDRE(year, selectedMonths);

  return (
    <DRETableClient 
      year={year}
      selectedMonths={selectedMonths}
      rows={rows}
    />
  );
}