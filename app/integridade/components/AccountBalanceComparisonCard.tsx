import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountBalanceComparison } from '../actions';

interface Props {
  accountBalanceComparisons: AccountBalanceComparison[];
}

export function AccountBalanceComparisonCard({ accountBalanceComparisons }: Props) {
  if (accountBalanceComparisons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            ⚖️ Comparação de Saldos por Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground text-4xl mb-4">📊</div>
            <p className="text-muted-foreground">
              Nenhuma transação encontrada para comparação.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRaw = accountBalanceComparisons.reduce((sum, acc) => sum + acc.rawTransactionsBalance, 0);
  const totalProcessed = accountBalanceComparisons.reduce((sum, acc) => sum + acc.processedTransactionsBalance, 0);
  const totalDifference = Math.abs(totalRaw - totalProcessed);
  const overallProcessedPercentage = totalRaw !== 0 ? (totalProcessed / totalRaw) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          ⚖️ Comparação de Saldos por Conta
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Saldos calculados: transações brutas vs transações processadas
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Resumo geral */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totalRaw)}
              </div>
              <div className="text-xs text-blue-600">Total Bruto</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totalProcessed)}
              </div>
              <div className="text-xs text-green-600">Total Processado</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(totalDifference)}
              </div>
              <div className="text-xs text-orange-600">Diferença</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {overallProcessedPercentage.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-600">Taxa Processamento</div>
            </div>
          </div>
        </div>

        {/* Detalhes por conta */}
        <div className="space-y-4">
          {accountBalanceComparisons.map((account) => {
            const isBalanced = account.difference < 1; // Consideramos diferenças menores que R$ 1 como balanceadas
            
            return (
              <div 
                key={account.bankAccountId}
                className={`p-4 border rounded-lg ${
                  isBalanced ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {account.accountName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {account.bankName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={isBalanced ? 'text-green-600' : 'text-red-600'}>
                      {isBalanced ? '✅' : '⚠️'}
                    </span>
                    <span className="text-sm font-medium">
                      {account.processedPercentage.toFixed(1)}% processado
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600 mb-1">Saldo Bruto</div>
                    <div className="font-medium text-blue-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(account.rawTransactionsBalance)}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600 mb-1">Saldo Processado</div>
                    <div className="font-medium text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(account.processedTransactionsBalance)}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded border">
                    <div className="text-sm text-gray-600 mb-1">Diferença</div>
                    <div className={`font-medium ${
                      isBalanced ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(account.difference)}
                    </div>
                  </div>
                </div>

                {!isBalanced && (
                  <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
                    💡 Existem transações desta conta que ainda não foram processadas no sistema unificado.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rodapé informativo */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            📘 Como interpretar esta comparação:
          </h4>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
            <li><strong>Saldo Bruto:</strong> Soma de todas as transações importadas desta conta</li>
            <li><strong>Saldo Processado:</strong> Soma das transações que já foram processadas no sistema unificado</li>
            <li><strong>Diferença:</strong> Valor das transações que ainda precisam ser processadas</li>
            <li><strong>✅ Balanceado:</strong> Diferença menor que R$ 1,00</li>
            <li><strong>⚠️ Desbalanceado:</strong> Há transações não processadas</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}