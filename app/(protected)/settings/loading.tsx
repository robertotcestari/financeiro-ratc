import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="h-9 w-48 mb-2 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="space-y-6">
        {/* Loading cards */}
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-64 mt-2 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-20 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-px w-full bg-gray-200" />
                <div className="h-16 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}