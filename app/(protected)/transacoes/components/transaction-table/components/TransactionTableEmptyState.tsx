export function TransactionTableEmptyState() {
  return (
    <div className="px-6 py-12 text-center">
      <div className="text-gray-500">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg font-medium text-gray-900 mb-2">
          Nenhuma transação encontrada
        </p>
        <p className="text-gray-500">
          Tente ajustar os filtros ou verifique se há dados importados no
          sistema.
        </p>
      </div>
    </div>
  );
}