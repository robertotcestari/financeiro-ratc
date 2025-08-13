'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign } from 'lucide-react';
import type { RuleFormReturn } from './form-types';

interface ValueCriteriaFormProps {
  form: RuleFormReturn;
}

const operatorLabels = {
  gt: 'Maior que',
  gte: 'Maior ou igual a',
  lt: 'Menor que',
  lte: 'Menor ou igual a',
  eq: 'Igual a',
  between: 'Entre',
};

export default function ValueCriteriaForm({ form }: ValueCriteriaFormProps) {
  const [useValue, setUseValue] = useState(false);

  const criteria = form.watch('criteria') || {};
  const valueCriteria = criteria.value || {};
  const operator = valueCriteria.operator || 'gte';

  // Initialize useValue state based on existing criteria
  useEffect(() => {
    const hasValueCriteria = criteria.value && (
      criteria.value.operator || 
      criteria.value.min !== undefined || 
      criteria.value.max !== undefined
    );
    setUseValue(!!hasValueCriteria);
  }, [criteria.value]);

  const handleValueToggle = (enabled: boolean) => {
    setUseValue(enabled);
    if (!enabled) {
      const currentCriteria = form.getValues('criteria');
      const newCriteria = { ...currentCriteria };
      delete newCriteria.value;
      form.setValue('criteria', newCriteria);
    } else {
      form.setValue('criteria.value', { operator: 'gte', min: 0 });
    }
  };

  const handleOperatorChange = (newOperator: string) => {
    const currentValue = form.getValues('criteria.value') || {};
    let newValue = { ...currentValue, operator: newOperator };

    // Reset values based on operator
    switch (newOperator) {
      case 'gt':
      case 'gte':
        newValue = { operator: newOperator, min: currentValue.min || 0 };
        break;
      case 'lt':
      case 'lte':
        newValue = { operator: newOperator, max: currentValue.max || 100 };
        break;
      case 'eq':
        newValue = { operator: newOperator, min: currentValue.min || 0 };
        break;
      case 'between':
        newValue = { 
          operator: newOperator, 
          min: currentValue.min || 0, 
          max: currentValue.max || 100 
        };
        break;
    }

    form.setValue('criteria.value', newValue);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getDescription = (): string => {
    if (!valueCriteria || !operator) return '';

    const { min, max } = valueCriteria;

    switch (operator) {
      case 'gt':
        return min != null ? `Valor maior que ${formatCurrency(min)}` : '';
      case 'gte':
        return min != null ? `Valor maior ou igual a ${formatCurrency(min)}` : '';
      case 'lt':
        return max != null ? `Valor menor que ${formatCurrency(max)}` : '';
      case 'lte':
        return max != null ? `Valor menor ou igual a ${formatCurrency(max)}` : '';
      case 'eq':
        return min != null ? `Valor igual a ${formatCurrency(min)}` : '';
      case 'between':
        return min != null && max != null 
          ? `Valor entre ${formatCurrency(min)} e ${formatCurrency(max)}` 
          : '';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-sm font-medium">Critérios de Valor</h4>
      </div>

      <div className="space-y-4 pl-7">
        <div className="flex items-center justify-between">
          <div>
            <FormLabel>Filtrar por Valor</FormLabel>
            <FormDescription className="text-xs">
              Aplicar apenas em transações com valores específicos.
            </FormDescription>
          </div>
          <Switch
            checked={useValue}
            onCheckedChange={handleValueToggle}
          />
        </div>

        {useValue && (
          <div className="space-y-4">
            {/* Operator Selection */}
            <FormItem>
              <FormLabel>Condição</FormLabel>
              <Select value={operator} onValueChange={handleOperatorChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a condição" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(operatorLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>

            {/* Value Inputs */}
            <div className="grid grid-cols-1 gap-4">
              {(operator === 'gt' || operator === 'gte' || operator === 'eq' || operator === 'between') && (
                <FormField
                  control={form.control}
                  name="criteria.value.min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {operator === 'eq' ? 'Valor' : 'Valor mínimo'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(operator === 'lt' || operator === 'lte' || operator === 'between') && (
                <FormField
                  control={form.control}
                  name="criteria.value.max"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor máximo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {getDescription() && (
              <FormDescription className="text-xs bg-muted p-2 rounded">
                <strong>Resumo:</strong> {getDescription()}
                <br />
                <em>Nota: Valores negativos (despesas) são comparados pelo valor absoluto.</em>
              </FormDescription>
            )}
          </div>
        )}
      </div>
    </div>
  );
}