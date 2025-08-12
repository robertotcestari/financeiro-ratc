'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnprocessedTransaction, processTransactionToUnified } from '../actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  unprocessedTransactions: UnprocessedTransaction[];
  totalUnprocessed: number;
}

export function UnprocessedTransactionsCard({ 
  unprocessedTransactions, 
  totalUnprocessed 
}: Props) {
  const router = useRouter();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const showingCount = unprocessedTransactions.length;
  const hasMore = totalUnprocessed > showingCount;

  const handleProcessTransaction = async (transactionId: string) => {
    setProcessingIds(prev => new Set(prev).add(transactionId));
    
    try {
      const result = await processTransactionToUnified(transactionId);
      
      if (result.success) {
        // Refresh a página para mostrar as mudanças
        router.refresh();
      } else {
        alert(`Erro ao processar transação: ${result.error}`);
      }
    } catch (error) {
      alert('Erro ao processar transação');
      console.error(error);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
    }
  };

  if (totalUnprocessed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            ✅ Transações Não Processadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">🎉</div>
            <p className="text-green-700 font-medium">
              Parabéns! Todas as transações foram processadas.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Todas as transações estão no sistema unificado!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>⚠️ Transações Não Processadas</span>
          <span className="text-sm font-normal text-muted-foreground">
            {showingCount} de {totalUnprocessed}
            {hasMore && ' (mostrando últimas 100)'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unprocessedTransactions.map((transaction) => (
            <div 
              key={transaction.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {transaction.bankAccountName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {transaction.date.toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {transaction.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.bankName}
                </p>
              </div>
              
              <div className="text-right ml-4 flex items-center gap-3">
                <div className={`font-medium ${
                  transaction.amount >= 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(transaction.amount)}
                </div>
                
                <Button
                  size="sm"
                  onClick={() => handleProcessTransaction(transaction.id)}
                  disabled={processingIds.has(transaction.id)}
                  className="ml-2"
                >
                  {processingIds.has(transaction.id) ? 'Processando...' : 'Processar'}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
            <p className="text-sm text-blue-700">
              Existem mais {totalUnprocessed - showingCount} transações não processadas.
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Considere usar filtros por período para visualizar todas.
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            💡 Como processar essas transações:
          </h4>
          <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
            <li>Clique no botão <strong>&quot;Processar&quot;</strong> ao lado de cada transação</li>
            <li>A transação será automaticamente criada no sistema unificado</li>
            <li>Depois vá para a página de <strong>Transações</strong> para categorizá-las</li>
            <li>Vincule às propriedades quando necessário</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}