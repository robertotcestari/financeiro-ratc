export function BanksListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 animate-pulse"
        >
          <div className="h-7 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}