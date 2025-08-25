import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { TransferDetail } from '../actions';

interface TransferStats {
  totalTransfers: number;
  categorizedTransfers: number;
  uncategorizedTransfers: number;
  netAmount: number;
  volumeAmount: number;
}

interface Props {
  transferStats: TransferStats;
  transferDetails: TransferDetail[];
}

export function TransferStatsCard({ transferStats, transferDetails }: Props) {

  if (transferStats.totalTransfers === 0) {
  return (
    <Card className={Math.abs(transferStats.netAmount) >= 1 ? 'border-red-500' : ''}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-600" />
            Transferências Entre Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-4xl mb-4">
              <FileText className="h-16 w-16 mx-auto text-gray-400" />
            </div>
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
    <Card className={Math.abs(transferStats.netAmount) >= 1 ? 'border-red-500' : ''}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-indigo-600" />
          Transferências Entre Contas
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
              <div className="flex items-center gap-1">
                Valor Líquido 
                {Math.abs(transferStats.netAmount) < 1 ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                }
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de Transferências */}
        {transferDetails.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Lista de Transferências</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Data</th>
                    <th className="text-left py-2 px-2">Conta Bancária</th>
                    <th className="text-left py-2 px-2">Descrição</th>
                    <th className="text-right py-2 px-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transferDetails.map((transfer) => (
                    <tr key={transfer.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        {new Intl.DateTimeFormat('pt-BR').format(new Date(transfer.date))}
                      </td>
                      <td className="py-2 px-2">
                        <div className="text-xs text-gray-600">{transfer.bankName}</div>
                        <div>{transfer.bankAccountName}</div>
                      </td>
                      <td className="py-2 px-2 max-w-xs truncate" title={transfer.description}>
                        {transfer.description}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className={transfer.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(transfer.amount)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-semibold">
                    <td colSpan={3} className="py-2 px-2 text-right">Total:</td>
                    <td className="py-2 px-2 text-right">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(transferDetails.reduce((sum, transfer) => sum + transfer.amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {transferStats.uncategorizedTransfers > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
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

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
            <Info className="h-4 w-4" />
            Sobre transferências:
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