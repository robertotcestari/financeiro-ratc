'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Lightbulb, Check, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { applySuggestionAction, dismissSuggestionAction } from '../actions';
import { useTransition } from 'react';

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
  transaction: Transaction;
}

export default function SuggestionIndicator({ transaction }: Props) {
  const [isPending, startTransition] = useTransition();
  const { suggestions } = transaction;

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleApplySuggestion = (suggestionId: string) => {
    startTransition(async () => {
      await applySuggestionAction({ suggestionId });
    });
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    startTransition(async () => {
      await dismissSuggestionAction({ suggestionId });
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatCategoryDisplay = (category: Suggestion['suggestedCategory']) => {
    if (!category) return null;
    return category.parent ? `${category.parent.name} > ${category.name}` : category.name;
  };

  // const primarySuggestion = suggestions[0]; // Highest confidence suggestion

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-1 cursor-pointer">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          {suggestions.length > 1 && (
            <Badge variant="secondary" className="text-xs">
              {suggestions.length}
            </Badge>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h4 className="font-medium">
              {suggestions.length === 1 ? 'Sugestão' : `${suggestions.length} Sugestões`}
            </h4>
          </div>
          
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3 space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{suggestion.rule.name}</span>
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/regras-categorizacao/${suggestion.rule.id}/edit`}
                    className="text-blue-500 hover:text-blue-700 transition-all duration-200 p-1 rounded hover:bg-blue-50"
                    title={`Editar regra: ${suggestion.rule.name}`}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                </div>
              </div>
              
              {suggestion.rule.description && (
                <p className="text-xs text-gray-500">{suggestion.rule.description}</p>
              )}
              
              <div className="space-y-1">
                {suggestion.suggestedCategory && (
                  <div>
                    <span className="text-xs text-gray-500">Categoria: </span>
                    <span className="text-xs font-medium">
                      {formatCategoryDisplay(suggestion.suggestedCategory)}
                    </span>
                  </div>
                )}
                
                {suggestion.suggestedProperty && (
                  <div>
                    <span className="text-xs text-gray-500">Propriedade: </span>
                    <span className="text-xs font-medium">
                      {suggestion.suggestedProperty.code} - {suggestion.suggestedProperty.city}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleApplySuggestion(suggestion.id)}
                  disabled={isPending}
                  className="flex-1 h-7 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Aplicar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDismissSuggestion(suggestion.id)}
                  disabled={isPending}
                  className="flex-1 h-7 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Descartar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}