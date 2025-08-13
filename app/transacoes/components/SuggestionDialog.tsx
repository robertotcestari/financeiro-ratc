'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Lightbulb, 
  Building, 
  Target,
  MapPin 
} from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import SuggestionDetails from './SuggestionDetails';

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
  year: number;
  month: number;
  details: string | null;
  notes: string | null;
  isReviewed: boolean;
  isPending: boolean;
  transaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    bankAccount: {
      name: string;
      bankName: string;
    };
  };
  category: {
    id: string;
    name: string;
    type: string;
    parent: {
      name: string;
    } | null;
  };
  property: {
    code: string;
    city: string;
  } | null;
  suggestions: Suggestion[];
}

interface Props {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplySuggestion?: (suggestionId: string) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
}

export default function SuggestionDialog({ 
  transaction, 
  open, 
  onOpenChange,
  onApplySuggestion,
  onDismissSuggestion 
}: Props) {
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  
  const selectedSuggestion = selectedSuggestionId 
    ? transaction.suggestions.find(s => s.id === selectedSuggestionId)
    : transaction.suggestions[0]; // Default to first suggestion

  const handleApply = () => {
    if (selectedSuggestion && onApplySuggestion) {
      onApplySuggestion(selectedSuggestion.id);
      onOpenChange(false);
    }
  };

  const handleDismiss = () => {
    if (selectedSuggestion && onDismissSuggestion) {
      onDismissSuggestion(selectedSuggestion.id);
      onOpenChange(false);
    }
  };

  if (!transaction.suggestions.length) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Sugestões de Categorização
          </DialogTitle>
          <DialogDescription>
            Análise automática encontrou {transaction.suggestions.length} sugestão(ões) para esta transação
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Transaction Information */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Informações da Transação
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Data:</span>
                  <span className="font-medium">{formatDate(transaction.transaction.date)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor:</span>
                  <span className={`font-medium ${
                    transaction.transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(transaction.transaction.amount)}
                  </span>
                </div>
                
                <div>
                  <div className="text-gray-600 mb-1">Descrição:</div>
                  <div className="font-medium text-gray-900 break-words">
                    {transaction.transaction.description}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Conta:</span>
                  <div className="text-right">
                    <div className="font-medium">{transaction.transaction.bankAccount.name}</div>
                    <div className="text-xs text-gray-500">{transaction.transaction.bankAccount.bankName}</div>
                  </div>
                </div>

                {transaction.details && (
                  <div>
                    <div className="text-gray-600 mb-1">Detalhes:</div>
                    <div className="text-gray-900 break-words">{transaction.details}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Current Categorization */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Categorização Atual
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {transaction.category.type === 'INCOME' ? 'Receita' :
                     transaction.category.type === 'EXPENSE' ? 'Despesa' :
                     transaction.category.type === 'TRANSFER' ? 'Transferência' : 'Ajuste'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {transaction.category.parent ? 
                      `${transaction.category.parent.name} > ${transaction.category.name}` :
                      transaction.category.name
                    }
                  </span>
                </div>
                
                {transaction.property && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{transaction.property.code}</span>
                    <span className="text-gray-600">- {transaction.property.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-4">
            {/* Suggestion Selector */}
            {transaction.suggestions.length > 1 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Sugestões Encontradas ({transaction.suggestions.length})
                </h3>
                
                <div className="space-y-2">
                  {transaction.suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      onClick={() => setSelectedSuggestionId(suggestion.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        selectedSuggestion?.id === suggestion.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">
                            Sugestão #{index + 1}
                          </div>
                          <div className="text-xs text-gray-600">
                            {suggestion.rule.name}
                          </div>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={
                            suggestion.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                            suggestion.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }
                        >
                          {Math.round(suggestion.confidence * 100)}%
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
                
                <Separator className="my-4" />
              </div>
            )}

            {/* Selected Suggestion Details */}
            {selectedSuggestion && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Detalhes da Sugestão Selecionada
                </h3>
                <SuggestionDetails suggestion={selectedSuggestion} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              Descartar Sugestão
            </Button>
            
            <Button
              onClick={handleApply}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Aplicar Sugestão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}