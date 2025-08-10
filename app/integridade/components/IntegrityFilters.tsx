'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';

export function IntegrityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentYear = searchParams.get('year') || new Date().getFullYear().toString();
  const currentMonth = searchParams.get('month') || '';

  const handleFilterChange = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
      
      // Se um mês foi selecionado e não há ano, adiciona o ano atual
      if (key === 'month' && !params.get('year')) {
        params.set('year', new Date().getFullYear().toString());
      }
    } else {
      params.delete(key);
      
      // Se o ano foi removido, também remove o mês
      if (key === 'year') {
        params.delete('month');
      }
    }
    
    router.push(`/integridade?${params.toString()}`);
  }, [router, searchParams]);

  const years = [];
  const currentYearNum = new Date().getFullYear();
  for (let year = currentYearNum; year >= 2020; year--) {
    years.push(year);
  }

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  const clearFilters = () => {
    router.push('/integridade');
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Ano
          </label>
          <select
            id="year"
            value={currentYear}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todos</option>
            {years.map(year => (
              <option key={year} value={year.toString()}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
            Mês
          </label>
          <select
            id="month"
            value={currentMonth}
            onChange={(e) => handleFilterChange('month', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Todos</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {(currentYear || currentMonth) && (
          <div>
            <div className="block text-sm font-medium text-gray-700 mb-1 opacity-0">
              &nbsp;
            </div>
            <Button
              onClick={clearFilters}
              variant="outline"
            >
              Limpar Filtros
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-end">
          <div className="text-sm text-gray-600">
            {currentMonth && currentYear ? (
              <span>
                Visualizando: {months.find(m => m.value === currentMonth)?.label} de {currentYear}
              </span>
            ) : currentYear ? (
              <span>Visualizando: Ano {currentYear}</span>
            ) : (
              <span>Visualizando: Todos os períodos</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}