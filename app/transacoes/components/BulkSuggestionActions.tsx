'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Lightbulb, 
  Zap, 
  X, 
  CheckCircle, 
  AlertTriangle,
  BarChart3 
} from 'lucide-react';

interface Suggestion {
  id: string;
  confidence: number;
  createdAt: Date;
  rule: {
    id: string;
    name: string;
    description?: string;
  };
  suggestedCategory: {
    id: string;
    name: string;
    type: string;
    parent: { name: string } | null;
  } | null;
  suggestedProperty: {
    id: string;
    code: string;
    city: string;
  } | null;
}

interface Transaction {
  id: string;
  suggestions: Suggestion[];
}

interface Props {
  selectedTransactions: Transaction[];
  onApplyBulkSuggestions?: (suggestionIds: string[]) => Promise<void>;
  onDismissBulkSuggestions?: (suggestionIds: string[]) => Promise<void>;
  onGenerateSuggestions?: (transactionIds: string[]) => Promise<void>;
  className?: string;
}

export default function BulkSuggestionActions({
  selectedTransactions,
  onApplyBulkSuggestions,
  onDismissBulkSuggestions,
  onGenerateSuggestions,
  className = '',
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmation, setShowConfirmation] = useState<'apply' | 'dismiss' | null>(null);

  // Calculate suggestion statistics
  const transactionsWithSuggestions = selectedTransactions.filter(t => t.suggestions.length > 0);
  const transactionsWithoutSuggestions = selectedTransactions.filter(t => t.suggestions.length === 0);
  const totalSuggestions = selectedTransactions.reduce((acc, t) => acc + t.suggestions.length, 0);
  const allSuggestionIds = selectedTransactions.flatMap(t => t.suggestions.map(s => s.id));

  // Group suggestions by confidence level
  const highConfidenceSuggestions = selectedTransactions
    .flatMap(t => t.suggestions)
    .filter(s => s.confidence >= 0.8);
  const mediumConfidenceSuggestions = selectedTransactions
    .flatMap(t => t.suggestions)
    .filter(s => s.confidence >= 0.6 && s.confidence < 0.8);
  const lowConfidenceSuggestions = selectedTransactions
    .flatMap(t => t.suggestions)
    .filter(s => s.confidence < 0.6);

  const handleGenerateSuggestions = () => {
    if (!onGenerateSuggestions || transactionsWithoutSuggestions.length === 0) return;
    
    startTransition(async () => {
      await onGenerateSuggestions(transactionsWithoutSuggestions.map(t => t.id));
    });
  };

  const handleApplyAll = () => {
    if (!onApplyBulkSuggestions || allSuggestionIds.length === 0) return;
    
    startTransition(async () => {
      await onApplyBulkSuggestions(allSuggestionIds);
      setShowConfirmation(null);
    });
  };

  const handleApplyHighConfidence = () => {
    if (!onApplyBulkSuggestions || highConfidenceSuggestions.length === 0) return;
    
    startTransition(async () => {
      await onApplyBulkSuggestions(highConfidenceSuggestions.map(s => s.id));
      setShowConfirmation(null);
    });
  };

  const handleDismissAll = () => {
    if (!onDismissBulkSuggestions || allSuggestionIds.length === 0) return;
    
    startTransition(async () => {
      await onDismissBulkSuggestions(allSuggestionIds);
      setShowConfirmation(null);
    });
  };

  const handleDismissLowConfidence = () => {
    if (!onDismissBulkSuggestions || lowConfidenceSuggestions.length === 0) return;
    
    startTransition(async () => {
      await onDismissBulkSuggestions(lowConfidenceSuggestions.map(s => s.id));
      setShowConfirmation(null);
    });
  };

  if (selectedTransactions.length === 0) {
    return null;
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Lightbulb className="h-5 w-5" />
          Ações em Lote para Sugestões
          <Badge variant="secondary" className="ml-2">
            {selectedTransactions.length} transaç{selectedTransactions.length === 1 ? 'ão' : 'ões'}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-blue-600">{totalSuggestions}</div>
            <div className="text-xs text-gray-600">Total de Sugestões</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{highConfidenceSuggestions.length}</div>
            <div className="text-xs text-gray-600">Alta Confiança (≥80%)</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-yellow-600">{mediumConfidenceSuggestions.length}</div>
            <div className="text-xs text-gray-600">Média Confiança (60-79%)</div>
          </div>
          
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-red-600">{lowConfidenceSuggestions.length}</div>
            <div className="text-xs text-gray-600">Baixa Confiança (&lt;60%)</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Generate Suggestions */}
          {transactionsWithoutSuggestions.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  Gerar sugestões para {transactionsWithoutSuggestions.length} transação(ões) sem sugestões
                </span>
              </div>
              
              <Button
                onClick={handleGenerateSuggestions}
                disabled={isPending}
                size="sm"
                variant="outline"
              >
                <Lightbulb className="h-4 w-4 mr-1" />
                Gerar Sugestões
              </Button>
            </div>
          )}

          {/* Apply Actions */}
          {totalSuggestions > 0 && (
            <>
              {highConfidenceSuggestions.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">
                      Aplicar {highConfidenceSuggestions.length} sugestão(ões) de alta confiança
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      ≥80%
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={handleApplyHighConfidence}
                    disabled={isPending}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Aplicar Alta Confiança
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">
                    Aplicar todas as {totalSuggestions} sugestão(ões)
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    Todas
                  </Badge>
                </div>
                
                <Button
                  onClick={() => setShowConfirmation('apply')}
                  disabled={isPending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Aplicar Todas
                </Button>
              </div>
            </>
          )}

          {/* Dismiss Actions */}
          {totalSuggestions > 0 && (
            <>
              {lowConfidenceSuggestions.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">
                      Descartar {lowConfidenceSuggestions.length} sugestão(ões) de baixa confiança
                    </span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 text-xs">
                      &lt;60%
                    </Badge>
                  </div>
                  
                  <Button
                    onClick={handleDismissLowConfidence}
                    disabled={isPending}
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Descartar Baixa Confiança
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">
                    Descartar todas as {totalSuggestions} sugestão(ões)
                  </span>
                </div>
                
                <Button
                  onClick={() => setShowConfirmation('dismiss')}
                  disabled={isPending}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Descartar Todas
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Confirmation Dialog Inline */}
        {showConfirmation && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 mb-2">
                  {showConfirmation === 'apply' ? 'Confirmar Aplicação' : 'Confirmar Descarte'}
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  {showConfirmation === 'apply' 
                    ? `Tem certeza que deseja aplicar todas as ${totalSuggestions} sugestões? Esta ação irá alterar as categorizações das transações selecionadas.`
                    : `Tem certeza que deseja descartar todas as ${totalSuggestions} sugestões? Esta ação não pode ser desfeita.`
                  }
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={showConfirmation === 'apply' ? handleApplyAll : handleDismissAll}
                    disabled={isPending}
                    size="sm"
                    variant={showConfirmation === 'apply' ? 'default' : 'destructive'}
                  >
                    {showConfirmation === 'apply' ? 'Confirmar Aplicação' : 'Confirmar Descarte'}
                  </Button>
                  
                  <Button
                    onClick={() => setShowConfirmation(null)}
                    disabled={isPending}
                    size="sm"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalSuggestions === 0 && (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">
              Nenhuma sugestão disponível para as transações selecionadas.
            </p>
            {transactionsWithoutSuggestions.length > 0 && (
              <p className="text-gray-500 text-xs mt-1">
                Use o botão &quot;Gerar Sugestões&quot; acima para criar novas sugestões.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}