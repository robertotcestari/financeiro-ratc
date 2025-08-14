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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';
import type { RuleFormReturn } from './form-types';

interface DateCriteriaFormProps {
  form: RuleFormReturn;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function DateCriteriaForm({ form }: DateCriteriaFormProps) {
  const criteria = form.watch('criteria') || {};
  const dateCriteria = criteria.date || {};
  const selectedMonths = dateCriteria.months || [];
  
  // Initialize state from form values
  const [useDayRange, setUseDayRange] = useState(() => Boolean(dateCriteria.dayRange));
  const [useMonths, setUseMonths] = useState(() => Boolean(dateCriteria.months && dateCriteria.months.length > 0));

  // Update state when form values change
  React.useEffect(() => {
    const newCriteria = form.getValues('criteria') || {};
    const newDateCriteria = newCriteria.date || {};
    setUseDayRange(Boolean(newDateCriteria.dayRange));
    setUseMonths(Boolean(newDateCriteria.months && newDateCriteria.months.length > 0));
  }, [form]);

  const handleDayRangeToggle = (enabled: boolean) => {
    setUseDayRange(enabled);
    if (!enabled) {
      const currentCriteria = form.getValues('criteria');
      const newCriteria = { ...currentCriteria };
      if (newCriteria.date) {
        delete newCriteria.date.dayRange;
        if (Object.keys(newCriteria.date).length === 0) {
          delete newCriteria.date;
        }
      }
      form.setValue('criteria', newCriteria);
    } else {
      form.setValue('criteria.date.dayRange', { start: 1, end: 31 });
    }
  };

  const handleMonthsToggle = (enabled: boolean) => {
    setUseMonths(enabled);
    if (!enabled) {
      const currentCriteria = form.getValues('criteria');
      const newCriteria = { ...currentCriteria };
      if (newCriteria.date) {
        delete newCriteria.date.months;
        if (Object.keys(newCriteria.date).length === 0) {
          delete newCriteria.date;
        }
      }
      form.setValue('criteria', newCriteria);
    } else {
      form.setValue('criteria.date.months', []);
    }
  };

  const handleMonthToggle = (monthNumber: number) => {
    const currentMonths = selectedMonths;
    const updatedMonths = currentMonths.includes(monthNumber)
      ? currentMonths.filter((m: number) => m !== monthNumber)
      : [...currentMonths, monthNumber];
    
    form.setValue('criteria.date.months', updatedMonths);
  };

  const handleDayRangeChange = (field: 'start' | 'end', value: number) => {
    const currentDayRange = form.getValues('criteria.date.dayRange') || { start: 1, end: 31 };
    const newDayRange = { ...currentDayRange, [field]: value };
    
    // Validate range
    if (field === 'start' && value > newDayRange.end) {
      newDayRange.end = value;
    } else if (field === 'end' && value < newDayRange.start) {
      newDayRange.start = value;
    }
    
    form.setValue('criteria.date.dayRange', newDayRange);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-sm font-medium">Critérios de Data</h4>
      </div>

      <div className="space-y-4 pl-7">
        {/* Day Range */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel>Intervalo de Dias do Mês</FormLabel>
              <FormDescription className="text-xs">
                Aplicar apenas em transações que ocorrem em dias específicos do mês.
              </FormDescription>
            </div>
            <Switch
              checked={useDayRange}
              onCheckedChange={handleDayRangeToggle}
            />
          </div>

          {useDayRange && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Dia inicial</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dateCriteria.dayRange?.start || 1}
                      onChange={(e) => handleDayRangeChange('start', parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                </FormItem>
                <span className="text-muted-foreground pt-6">até</span>
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Dia final</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={dateCriteria.dayRange?.end || 31}
                      onChange={(e) => handleDayRangeChange('end', parseInt(e.target.value) || 31)}
                    />
                  </FormControl>
                </FormItem>
              </div>
              <FormDescription className="text-xs">
                {dateCriteria.dayRange?.start === dateCriteria.dayRange?.end
                  ? `Aplicar apenas no dia ${dateCriteria.dayRange?.start} de cada mês`
                  : `Aplicar do dia ${dateCriteria.dayRange?.start || 1} até o dia ${dateCriteria.dayRange?.end || 31} de cada mês`
                }
              </FormDescription>
            </div>
          )}
        </div>

        {/* Month Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel>Meses Específicos</FormLabel>
              <FormDescription className="text-xs">
                Aplicar apenas em transações que ocorrem em meses específicos.
              </FormDescription>
            </div>
            <Switch
              checked={useMonths}
              onCheckedChange={handleMonthsToggle}
            />
          </div>

          {useMonths && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {monthNames.map((monthName, index) => {
                  const monthNumber = index + 1;
                  const isSelected = selectedMonths.includes(monthNumber);
                  
                  return (
                    <Button
                      key={monthNumber}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="justify-center text-xs h-8"
                      onClick={() => handleMonthToggle(monthNumber)}
                    >
                      {monthName}
                    </Button>
                  );
                })}
              </div>
              
              {selectedMonths.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedMonths.map((monthNumber: number) => (
                    <Badge key={monthNumber} variant="secondary" className="text-xs">
                      {monthNames[monthNumber - 1]}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1"
                        onClick={() => handleMonthToggle(monthNumber)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <FormDescription className="text-xs">
                {selectedMonths.length === 0 
                  ? 'Selecione pelo menos um mês para ativar este critério'
                  : selectedMonths.length === 12
                  ? 'Aplicar em todos os meses (equivale a não usar este critério)'
                  : `Aplicar apenas em ${selectedMonths.length} mês${selectedMonths.length > 1 ? 'es' : ''} selecionado${selectedMonths.length > 1 ? 's' : ''}`
                }
              </FormDescription>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}