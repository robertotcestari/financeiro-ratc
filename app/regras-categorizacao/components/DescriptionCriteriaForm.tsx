'use client';

import React from 'react';

import { useState } from 'react';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Plus, X } from 'lucide-react';
import type { RuleFormReturn } from './form-types';

interface DescriptionCriteriaFormProps {
  form: RuleFormReturn;
}

export default function DescriptionCriteriaForm({ form }: DescriptionCriteriaFormProps) {
  const [useDescription, setUseDescription] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const criteria = form.watch('criteria') || {};
  const descriptionCriteria = criteria.description || {};
  const keywords = descriptionCriteria.keywords || [];
  const operator = descriptionCriteria.operator || 'or';
  const caseSensitive = descriptionCriteria.caseSensitive || false;

  const handleDescriptionToggle = (enabled: boolean) => {
    setUseDescription(enabled);
    if (!enabled) {
      const currentCriteria = form.getValues('criteria');
      const newCriteria = { ...currentCriteria };
      delete newCriteria.description;
      form.setValue('criteria', newCriteria);
    } else {
      form.setValue('criteria.description', {
        keywords: [],
        operator: 'or',
        caseSensitive: false,
      });
    }
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;

    const currentKeywords = form.getValues('criteria.description.keywords') || [];
    const trimmedKeyword = newKeyword.trim();
    
    if (!currentKeywords.includes(trimmedKeyword)) {
      form.setValue('criteria.description.keywords', [...currentKeywords, trimmedKeyword]);
    }
    
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const currentKeywords = form.getValues('criteria.description.keywords') || [];
    form.setValue(
      'criteria.description.keywords',
      currentKeywords.filter((k: string) => k !== keywordToRemove)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleOperatorChange = (newOperator: 'and' | 'or') => {
    form.setValue('criteria.description.operator', newOperator);
  };

  const handleCaseSensitiveChange = (enabled: boolean) => {
    form.setValue('criteria.description.caseSensitive', enabled);
  };

  const getDescription = (): string => {
    if (keywords.length === 0) return 'Adicione pelo menos uma palavra-chave';
    
    if (keywords.length === 1) {
      return `Transações que ${caseSensitive ? '' : '(sem diferenciar maiúsculas/minúsculas) '}contêm "${keywords[0]}"`;
    }

    const keywordList = keywords.map((k: string) => `"${k}"`).join(operator === 'and' ? ' E ' : ' OU ');
    return `Transações que ${caseSensitive ? '' : '(sem diferenciar maiúsculas/minúsculas) '}contêm ${keywordList}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-sm font-medium">Critérios de Descrição</h4>
      </div>

      <div className="space-y-4 pl-7">
        <div className="flex items-center justify-between">
          <div>
            <FormLabel>Filtrar por Palavras-chave</FormLabel>
            <FormDescription className="text-xs">
              Aplicar apenas em transações que contêm palavras ou frases específicas.
            </FormDescription>
          </div>
          <Switch
            checked={useDescription}
            onCheckedChange={handleDescriptionToggle}
          />
        </div>

        {useDescription && (
          <div className="space-y-4">
            {/* Add Keywords */}
            <div className="space-y-2">
              <FormLabel>Palavras-chave</FormLabel>
              <div className="flex space-x-2">
                <Input
                  placeholder="Digite uma palavra-chave..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddKeyword}
                  disabled={!newKeyword.trim()}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <FormDescription className="text-xs">
                Digite uma palavra ou frase e pressione Enter ou clique em + para adicionar.
              </FormDescription>
            </div>

            {/* Keywords List */}
            {keywords.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Palavras adicionadas</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => handleRemoveKeyword(keyword)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Operator Selection */}
            {keywords.length > 1 && (
              <FormItem>
                <FormLabel>Lógica de Combinação</FormLabel>
                <Select value={operator} onValueChange={handleOperatorChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="or">OU (qualquer palavra-chave)</SelectItem>
                    <SelectItem value="and">E (todas as palavras-chave)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs">
                  {operator === 'or' 
                    ? 'A transação deve conter pelo menos uma das palavras-chave'
                    : 'A transação deve conter todas as palavras-chave'
                  }
                </FormDescription>
              </FormItem>
            )}

            {/* Case Sensitivity */}
            <div className="flex items-center justify-between">
              <div>
                <FormLabel>Sensível a maiúsculas/minúsculas</FormLabel>
                <FormDescription className="text-xs">
                  Se ativado, &quot;ALUGUEL&quot; será diferente de &quot;aluguel&quot;.
                </FormDescription>
              </div>
              <Switch
                checked={caseSensitive}
                onCheckedChange={handleCaseSensitiveChange}
              />
            </div>

            {/* Description Preview */}
            <FormDescription className="text-xs bg-muted p-2 rounded">
              <strong>Resumo:</strong> {getDescription()}
            </FormDescription>
          </div>
        )}
      </div>
    </div>
  );
}