interface TransactionTableHeaderProps {
  currentPage: number;
  totalPages: number;
}

export function TransactionTableHeader({ currentPage, totalPages }: TransactionTableHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
        <div className="text-sm text-gray-500">
          Página {currentPage} de {totalPages}
        </div>
      </div>
    </div>
  );
}