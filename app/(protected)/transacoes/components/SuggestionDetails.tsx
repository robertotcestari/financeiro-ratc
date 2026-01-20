'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lightbulb, Calendar, User, Building, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/formatters';

interface Suggestion {
  id: string;
  confidence: number;
  createdAt: Date;
  rule?: {
    id: string;
    name: string;
    description?: string;
  } | null;
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

interface Props {
  suggestion: Suggestion;
}

export default function SuggestionDetails({ suggestion }: Props) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Média';
    return 'Baixa';
  };

  const formatCategoryDisplay = (category: Suggestion['suggestedCategory']) => {
    if (!category) return null;
    return category.parent ? `${category.parent.name} > ${category.name}` : category.name;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'EXPENSE':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'TRANSFER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ADJUSTMENT':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INCOME':
        return 'Receita';
      case 'EXPENSE':
        return 'Despesa';
      case 'TRANSFER':
        return 'Transferência';
      case 'ADJUSTMENT':
        return 'Ajuste';
      default:
        return type;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Detalhes da Sugestão
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rule or Source Information */}
        <div className="space-y-2">
          {suggestion.rule ? (
            <>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Regra:</span>
                <span className="text-sm">{suggestion.rule.name}</span>
              </div>
              
              {suggestion.rule.description && (
                <p className="text-sm text-gray-600 ml-6">
                  {suggestion.rule.description}
                </p>
              )}
            </>
          ) : null}
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Confiança:</span>
              <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
              </span>
            </div>
          </div>
          
          <div className="ml-6">
            <Progress 
              value={suggestion.confidence * 100} 
              className="w-full h-2"
            />
          </div>
        </div>

        {/* Suggested Category */}
        {suggestion.suggestedCategory && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Categoria Sugerida:</span>
            </div>
            
            <div className="ml-6 space-y-2">
              <Badge 
                variant="secondary" 
                className={`text-xs ${getTypeColor(suggestion.suggestedCategory.type)}`}
              >
                {getTypeLabel(suggestion.suggestedCategory.type)}
              </Badge>
              
              <div className="text-sm">
                {formatCategoryDisplay(suggestion.suggestedCategory)}
              </div>
            </div>
          </div>
        )}

        {/* Suggested Property */}
        {suggestion.suggestedProperty && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Propriedade Sugerida:</span>
            </div>
            
            <div className="ml-6 text-sm">
              <div className="font-medium">{suggestion.suggestedProperty.code}</div>
              <div className="text-gray-600">{suggestion.suggestedProperty.city}</div>
            </div>
          </div>
        )}

        {/* Creation Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>Criado em {formatDate(suggestion.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
