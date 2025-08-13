import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  totalTransactions: number;
  integrityStats: {
    transactionCount: number;
    processedCount: number;
    categorizedCount: number;
    unprocessedCount: number;
    uncategorizedCount: number;
  };
}

export function IntegrityComparisonCard({ 
  totalTransactions, 
  integrityStats
}: Props) {
  const processedPercentage = integrityStats.transactionCount > 0 
    ? (integrityStats.processedCount / integrityStats.transactionCount) * 100 
    : 0;
    
  const categorizedPercentage = integrityStats.processedCount > 0 
    ? (integrityStats.categorizedCount / integrityStats.processedCount) * 100 
    : 0;
  
  const isIntegrityOk = integrityStats.unprocessedCount === 0 && integrityStats.uncategorizedCount === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Estatísticas de Integridade
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {/* Total Transações (Raw) */}
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-gray-700">
              {integrityStats.transactionCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-gray-600">
              Total Transações
            </div>
            <div className="text-xs text-gray-500">
              (raw)
            </div>
          </div>

          {/* Transações Processadas */}
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-600">
              {integrityStats.processedCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-blue-600">
              Processadas
            </div>
            <div className="text-xs text-blue-500">
              ({processedPercentage.toFixed(1)}%)
            </div>
          </div>

          {/* Transações Categorizadas */}
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-xl font-bold text-green-600">
              {integrityStats.categorizedCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-sm text-green-600">
              Categorizadas
            </div>
            <div className="text-xs text-green-500">
              ({categorizedPercentage.toFixed(1)}%)
            </div>
          </div>

          {/* Não Processadas */}
          <div className={`p-4 rounded-lg text-center ${
            integrityStats.unprocessedCount === 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-xl font-bold ${
              integrityStats.unprocessedCount === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {integrityStats.unprocessedCount.toLocaleString('pt-BR')}
            </div>
            <div className={`text-sm ${
              integrityStats.unprocessedCount === 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              Não Processadas
            </div>
          </div>

          {/* Não Categorizadas */}
          <div className={`p-4 rounded-lg text-center ${
            integrityStats.uncategorizedCount === 0 ? 'bg-green-50' : 'bg-orange-50'
          }`}>
            <div className={`text-xl font-bold ${
              integrityStats.uncategorizedCount === 0 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {integrityStats.uncategorizedCount.toLocaleString('pt-BR')}
            </div>
            <div className={`text-sm ${
              integrityStats.uncategorizedCount === 0 ? 'text-green-600' : 'text-orange-600'
            }`}>
              Não Categorizadas
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
              {isIntegrityOk ? 
                <CheckCircle className="h-5 w-5 text-green-400" /> : 
                <AlertTriangle className="h-5 w-5 text-red-400" />
              }
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                isIntegrityOk ? 'text-green-700' : 'text-red-700'
              }`}>
                {isIntegrityOk 
                  ? <strong>Integridade Perfeita:</strong>
                  : <strong>ATENÇÃO:</strong>
                } {isIntegrityOk 
                  ? 'Todas as transações foram processadas e categorizadas!'
                  : `${integrityStats.unprocessedCount} não processadas, ${integrityStats.uncategorizedCount} sem categoria.`
                }
              </p>
            </div>
          </div>
        </div>

        {!isIntegrityOk && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              Para melhorar a integridade:
            </h4>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              {integrityStats.unprocessedCount > 0 && (
                <li>Processe {integrityStats.unprocessedCount} transações no sistema unificado</li>
              )}
              {integrityStats.uncategorizedCount > 0 && (
                <li>Categorize {integrityStats.uncategorizedCount} transações processadas</li>
              )}
              <li>Verifique se há transferências não identificadas</li>
              <li>Configure regras automáticas para processamento futuro</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}