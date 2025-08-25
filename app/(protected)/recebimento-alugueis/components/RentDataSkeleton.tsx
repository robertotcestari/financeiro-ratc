import RentSummaryCardsSkeleton from './RentSummaryCardsSkeleton';
import RentTableSkeleton from './RentTableSkeleton';

export default function RentDataSkeleton() {
  return (
    <>
      <div className="mb-6">
        <RentSummaryCardsSkeleton />
      </div>

      <div className="mb-4 flex justify-end">
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <RentTableSkeleton />
      </div>
    </>
  );
}