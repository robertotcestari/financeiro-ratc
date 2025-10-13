import type { TransactionSearchParams } from '../../../types';
import { ExportTransactionsButton } from './ExportTransactionsButton';

interface TransactionTableHeaderProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  filters: TransactionSearchParams;
}

export function TransactionTableHeader({
  currentPage,
  totalPages,
  totalCount,
  filters,
}: TransactionTableHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
          <div className="text-sm text-gray-500">
            Página {currentPage} de {totalPages} ·{' '}
            {totalCount.toLocaleString('pt-BR')} registros
          </div>
        </div>
        <ExportTransactionsButton filters={filters} disabled={totalCount === 0} />
      </div>
    </div>
  );
}
