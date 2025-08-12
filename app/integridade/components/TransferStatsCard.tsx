import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TransferStats {
  totalTransfers: number;
  categorizedTransfers: number;
  uncategorizedTransfers: number;
  netAmount: number;
  volumeAmount: number;
}

interface Props {
  transferStats: TransferStats;
}

export function TransferStatsCard({ transferStats }: Props) {
  const categorizationRate = transferStats.totalTransfers > 0
    ? ((transferStats.categorizedTransfers / transferStats.totalTransfers) * 100)
    : 0;

  if (transferStats.totalTransfers === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            🔄 Transferências Entre Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-4xl mb-4">📝</div>
            <p className="text-muted-foreground">
              Nenhuma transferência identificada no período.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Categorize transações com categorias do tipo &quot;TRANSFER&quot; para identificá-las.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          🔄 Transferências Entre Contas
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              {transferStats.categorizedTransfers}
            </div>
            <div className="text-sm text-green-600">
              Categorizadas
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {transferStats.uncategorizedTransfers}
            </div>
            <div className="text-sm text-orange-600">
              Não Categorizadas
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(transferStats.volumeAmount)}
            </div>
            <div className="text-sm text-blue-600">
              Volume Total
            </div>
          </div>

          <div className={`p-4 rounded-lg ${
            Math.abs(transferStats.netAmount) < 1 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-xl font-bold ${
              Math.abs(transferStats.netAmount) < 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(transferStats.netAmount)}
            </div>
            <div className={`text-sm ${
              Math.abs(transferStats.netAmount) < 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              Valor Líquido {Math.abs(transferStats.netAmount) < 1 ? '✅' : '⚠️'}
            </div>
          </div>
        </div>

        <div className="mt-4 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Taxa de Categorização
            </span>
            <span className="text-sm font-bold">
              {categorizationRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${categorizationRate}%` }}
            ></div>
          </div>
        </div>

        {transferStats.uncategorizedTransfers > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Existem <strong>{transferStats.uncategorizedTransfers}</strong> transferências 
                  que precisam ser categorizadas.
                </p>
              </div>
            </div>
          </div>
        )}

        {transferStats.uncategorizedTransfers === 0 && transferStats.totalTransfers > 0 && (
          <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Todas as transferências estão devidamente categorizadas!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            💡 Sobre transferências:
          </h4>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li><strong>Valor Líquido</strong>: Deveria ser R$ 0,00 (entrada = saída)</li>
            <li><strong>Volume Total</strong>: Soma dos valores absolutos (movimentação total)</li>
            <li>Transferências são categorizadas com categorias do tipo &quot;TRANSFER&quot;</li>
            <li>Não afetam o DRE (campo includeTransfers = false)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}