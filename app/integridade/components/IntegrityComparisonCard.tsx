import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  totalTransactions: number;
  totalBalances: number;
  difference: number;
  percentDiff: number;
  hasBalances: boolean;
}

export function IntegrityComparisonCard({ 
  totalTransactions, 
  totalBalances, 
  difference, 
  percentDiff, 
  hasBalances 
}: Props) {
  const isIntegrityOk = difference < 0.01;

  if (!hasBalances) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            🔄 Comparação de Integridade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <p className="text-muted-foreground">
              Não há registros de saldos (AccountBalance) para comparação.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              A comparação de integridade requer dados de saldos das contas bancárias.
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
          🔄 Comparação de Integridade
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(totalTransactions)}
            </div>
            <div className="text-sm text-blue-600">
              Total Transações
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(totalBalances)}
            </div>
            <div className="text-sm text-green-600">
              Total Saldos
            </div>
          </div>

          <div className={`p-4 rounded-lg text-center ${
            isIntegrityOk ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-xl font-bold ${
              isIntegrityOk ? 'text-green-600' : 'text-red-600'
            }`}>
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(difference)}
            </div>
            <div className={`text-sm ${
              isIntegrityOk ? 'text-green-600' : 'text-red-600'
            }`}>
              Diferença ({percentDiff.toFixed(2)}%)
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-lg border-l-4 ${
          isIntegrityOk 
            ? 'bg-green-50 border-green-400' 
            : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <span className={isIntegrityOk ? 'text-green-400' : 'text-red-400'}>
                {isIntegrityOk ? '✅' : '⚠️'}
              </span>
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                isIntegrityOk ? 'text-green-700' : 'text-red-700'
              }`}>
                {isIntegrityOk 
                  ? <strong>Integridade OK:</strong>
                  : <strong>ATENÇÃO:</strong>
                } {isIntegrityOk 
                  ? 'Os valores estão balanceados!'
                  : 'Existe diferença entre transações e saldos!'
                }
              </p>
            </div>
          </div>
        </div>

        {!isIntegrityOk && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              Possíveis causas da diferença:
            </h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Transações importadas após o último registro de saldo</li>
              <li>Diferenças de timing entre importação e saldos</li>
              <li>Transações manuais não refletidas nos saldos</li>
              <li>Problemas na sincronização com o banco</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}