import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface IntegrityStats {
  transactionCount: number;
  unifiedCount: number;
  uncategorizedCount: number;
}

interface Props {
  stats: IntegrityStats;
  unifiedWithoutCategory: number;
}

export function IntegrityStatsCard({ stats, unifiedWithoutCategory }: Props) {
  const categorizationPercent = stats.transactionCount > 0 
    ? ((stats.unifiedCount / stats.transactionCount) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          📈 Estatísticas de Categorização
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.transactionCount.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">
              Transações Brutas
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.unifiedCount.toLocaleString()}
            </div>
            <div className="text-sm text-green-600">
              Transações Unificadas
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {stats.uncategorizedCount.toLocaleString()}
            </div>
            <div className="text-sm text-orange-600">
              Não Categorizadas
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {categorizationPercent.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-600">
              Taxa de Categorização
            </div>
          </div>
        </div>

        {stats.uncategorizedCount > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Existem <strong>{stats.uncategorizedCount}</strong> transações não categorizadas!
                </p>
              </div>
            </div>
          </div>
        )}

        {unifiedWithoutCategory > 0 && (
          <div className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  <strong>{unifiedWithoutCategory}</strong> transações unificadas estão sem categoria!
                </p>
              </div>
            </div>
          </div>
        )}

        {stats.uncategorizedCount === 0 && unifiedWithoutCategory === 0 && (
          <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Todas as transações estão devidamente categorizadas!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}