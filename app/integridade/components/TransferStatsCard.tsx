import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TransferStats {
  totalTransfers: number;
  completeTransfers: number;
  incompleteTransfers: number;
  totalAmount: number;
}

interface Props {
  transferStats: TransferStats;
}

export function TransferStatsCard({ transferStats }: Props) {
  const completionRate = transferStats.totalTransfers > 0
    ? ((transferStats.completeTransfers / transferStats.totalTransfers) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          🔄 Transferências Entre Contas
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-indigo-600">
              {transferStats.totalTransfers}
            </div>
            <div className="text-sm text-indigo-600">
              Total de Transferências
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {transferStats.completeTransfers}
            </div>
            <div className="text-sm text-green-600">
              Transferências Completas
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {transferStats.incompleteTransfers}
            </div>
            <div className="text-sm text-red-600">
              Transferências Incompletas
            </div>
          </div>

          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-emerald-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(transferStats.totalAmount)}
            </div>
            <div className="text-sm text-emerald-600">
              Valor Total
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Taxa de Conclusão
            </span>
            <span className="text-sm font-bold">
              {completionRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>

        {transferStats.incompleteTransfers > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Existem <strong>{transferStats.incompleteTransfers}</strong> transferências incompletas 
                  que podem indicar problemas na correspondência entre contas.
                </p>
              </div>
            </div>
          </div>
        )}

        {transferStats.incompleteTransfers === 0 && transferStats.totalTransfers > 0 && (
          <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Todas as transferências foram identificadas e estão completas!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}