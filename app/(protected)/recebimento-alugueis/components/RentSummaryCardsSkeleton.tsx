export default function RentSummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1 - Total Recebido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-32 bg-gray-300 rounded mb-1" />
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>

      {/* Card 2 - Quantidade */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-16 bg-gray-300 rounded mb-1" />
        <div className="h-3 w-24 bg-gray-200 rounded" />
      </div>

      {/* Card 3 - Ticket Médio */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-28 bg-gray-300 rounded mb-1" />
        <div className="h-3 w-32 bg-gray-200 rounded" />
      </div>

      {/* Card 4 - Comparação */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-28 bg-gray-200 rounded" />
          <div className="h-8 w-8 bg-gray-200 rounded" />
        </div>
        <div className="h-8 w-20 bg-gray-300 rounded mb-1" />
        <div className="h-3 w-36 bg-gray-200 rounded" />
      </div>
    </div>
  );
}