import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

interface IntegrityStats {
  transactionCount: number;
  processedCount: number;
  categorizedCount: number;
  unprocessedCount: number;
  uncategorizedCount: number;
}

interface Props {
  stats: IntegrityStats;
  unifiedWithoutCategory: number;
}

export function IntegrityStatsCard({ stats }: Props) {
  const processingPercent = stats.transactionCount > 0 
    ? ((stats.processedCount / stats.transactionCount) * 100)
    : 0;

  const categorizationPercent = stats.processedCount > 0 
    ? ((stats.categorizedCount / stats.processedCount) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Resumo de Processamento
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-700">
              {stats.transactionCount.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">
              Transações Importadas
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {stats.processedCount.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">
              Processadas ({processingPercent.toFixed(1)}%)
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats.categorizedCount.toLocaleString()}
            </div>
            <div className="text-sm text-green-600">
              Categorizadas ({categorizationPercent.toFixed(1)}%)
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {(stats.unprocessedCount + stats.uncategorizedCount).toLocaleString()}
            </div>
            <div className="text-sm text-orange-600">
              Pendências Totais
            </div>
          </div>
        </div>

        {(stats.unprocessedCount > 0 || stats.uncategorizedCount > 0) && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <div className="text-sm text-yellow-700 space-y-1">
                  {stats.unprocessedCount > 0 && (
                    <p><strong>{stats.unprocessedCount}</strong> transações aguardando processamento</p>
                  )}
                  {stats.uncategorizedCount > 0 && (
                    <p><strong>{stats.uncategorizedCount}</strong> transações processadas sem categoria</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {stats.unprocessedCount === 0 && stats.uncategorizedCount === 0 && (
          <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Perfeito! Todas as transações foram processadas e categorizadas!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}