'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function IntegrityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentYear = searchParams.get('year') || '';
  const currentMonth = searchParams.get('month') || '';
  
  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

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

  // Funções para navegação de mês
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentYearNum = parseInt(currentYear);
    const currentMonthNum = parseInt(currentMonth) || 1;

    let newMonth = currentMonthNum;
    let newYear = currentYearNum;

    if (direction === 'prev') {
      if (currentMonthNum === 1) {
        newMonth = 12;
        newYear = currentYearNum - 1;
      } else {
        newMonth = currentMonthNum - 1;
      }
    } else {
      if (currentMonthNum === 12) {
        newMonth = 1;
        newYear = currentYearNum + 1;
      } else {
        newMonth = currentMonthNum + 1;
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('year', newYear.toString());
    params.set('month', newMonth.toString());
    
    router.push(`/integridade?${params.toString()}`);
  };

  // Obter nome do mês atual
  const getCurrentMonthName = () => {
    if (!currentMonth) return 'Todos os meses';
    const month = months.find(m => m.value === currentMonth);
    return month ? month.label : 'Todos os meses';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      {/* Navegação de período com setinhas */}
      {currentMonth && currentYear && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Button
            onClick={() => navigateMonth('prev')}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            title="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="px-4 py-2 bg-gray-50 rounded-lg border text-center shadow-sm min-w-[150px]">
            <div className="text-sm font-semibold text-gray-900">
              {getCurrentMonthName()}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {currentYear}
            </div>
          </div>

          <Button
            onClick={() => navigateMonth('next')}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            title="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ano
          </label>
          <Popover open={yearOpen} onOpenChange={setYearOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={yearOpen}
                className="w-[200px] justify-between"
              >
                {currentYear ? years.find(year => year.toString() === currentYear)?.toString() || 'Todos' : 'Todos'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Buscar ano..." />
                <CommandList>
                  <CommandEmpty>Nenhum ano encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        handleFilterChange('year', '');
                        setYearOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentYear === '' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos
                    </CommandItem>
                    {years.map(year => (
                      <CommandItem
                        key={year}
                        value={year.toString()}
                        onSelect={() => {
                          handleFilterChange('year', year.toString());
                          setYearOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentYear === year.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {year}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mês
          </label>
          <Popover open={monthOpen} onOpenChange={setMonthOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={monthOpen}
                className="w-[200px] justify-between"
              >
                {currentMonth ? months.find(month => month.value === currentMonth)?.label || 'Todos' : 'Todos'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Buscar mês..." />
                <CommandList>
                  <CommandEmpty>Nenhum mês encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        handleFilterChange('month', '');
                        setMonthOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentMonth === '' ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos
                    </CommandItem>
                    {months.map(month => (
                      <CommandItem
                        key={month.value}
                        value={month.label.toLowerCase()}
                        keywords={[month.label, month.label.toLowerCase()]}
                        onSelect={() => {
                          handleFilterChange('month', month.value);
                          setMonthOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentMonth === month.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {month.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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