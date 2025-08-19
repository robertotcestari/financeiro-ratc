'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface DREFiltersProps {
  year: number;
  selectedMonths: number[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

export function DREFilters({ year, selectedMonths }: DREFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentYear, setCurrentYear] = useState(year);
  const [currentMonths, setCurrentMonths] = useState(selectedMonths);

  const handleYearChange = (newYear: number) => {
    setCurrentYear(newYear);
    updateURL(newYear, currentMonths);
  };

  const handleMonthToggle = (month: number) => {
    const updatedMonths = currentMonths.includes(month)
      ? currentMonths.filter(m => m !== month)
      : [...currentMonths, month].sort((a, b) => a - b);
    
    setCurrentMonths(updatedMonths);
    updateURL(currentYear, updatedMonths);
  };

  const handleSelectAllMonths = () => {
    const allMonths = Array.from({ length: 12 }, (_, i) => i + 1);
    setCurrentMonths(allMonths);
    updateURL(currentYear, allMonths);
  };

  const handleClearMonths = () => {
    setCurrentMonths([]);
    updateURL(currentYear, []);
  };

  const updateURL = (newYear: number, newMonths: number[]) => {
    const params = new URLSearchParams(searchParams);
    params.set('year', newYear.toString());
    
    if (newMonths.length > 0) {
      params.set('months', newMonths.join(','));
    } else {
      params.delete('months');
    }
    
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="font-medium">Ano:</label>
          <select
            value={currentYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1"
          >
            {YEAR_OPTIONS.map(yearOption => (
              <option key={yearOption} value={yearOption}>
                {yearOption}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSelectAllMonths}
            variant="default"
            size="sm"
          >
            Todos os Meses
          </Button>
          <Button
            onClick={handleClearMonths}
            variant="outline"
            size="sm"
          >
            Limpar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {MONTH_NAMES.map((monthName, index) => {
          const monthNumber = index + 1;
          const isSelected = currentMonths.includes(monthNumber);
          
          return (
            <Button
              key={monthNumber}
              onClick={() => handleMonthToggle(monthNumber)}
              variant={isSelected ? "default" : "outline"}
              size="sm"
            >
              {monthName}
            </Button>
          );
        })}
      </div>

      {currentMonths.length > 0 && (
        <div className="text-sm text-gray-600">
          Exibindo: {currentMonths.map(m => MONTH_NAMES[m - 1]).join(', ')} de {currentYear}
        </div>
      )}
    </div>
  );
}