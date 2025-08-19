'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { ChevronLeft, ChevronRight, FileText, CheckCircle, Lightbulb, Zap, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Category {
  id: string;
  name: string;
  level: number;
  parent: { name: string } | null;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface Props {
  categories: Category[];
  bankAccounts: BankAccount[];
  searchParams: {
    categoria?: string;
    conta?: string;
    mes?: string;
    ano?: string;
    status?: string;
    sugestoes?: string;
    busca?: string;
    page?: string;
  };
}

export default function TransactionFilters({
  categories,
  bankAccounts,
  searchParams,
}: Props) {
  const router = useRouter();

  // Calcular mês anterior como padrão do inbox
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const defaultMonth = previousMonth.getMonth() + 1;
  const defaultYear = previousMonth.getFullYear();

  const [filters, setFilters] = useState({
    categoria: searchParams.categoria || '',
    conta: searchParams.conta || '',
    mes: searchParams.mes || defaultMonth.toString(),
    ano: searchParams.ano || defaultYear.toString(),
    status: searchParams.status || '',
    sugestoes: searchParams.sugestoes || '',
    busca: searchParams.busca || '',
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const months = [
    { value: '', label: 'Todos os meses' },
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
    { value: '12', label: 'Dezembro' },
  ];

  const updateFilter = (
    key: string,
    value: string,
    additionalUpdates?: Record<string, string>
  ) => {
    const newFilters = { ...filters, [key]: value, ...additionalUpdates };
    setFilters(newFilters);

    // Construir nova URL
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });

    // Reset page quando filtros mudarem
    params.delete('page');

    const queryString = params.toString();
    router.push(`/transacoes${queryString ? `?${queryString}` : ''}`);
  };

  const clearAllFilters = () => {
    setFilters({
      categoria: '',
      conta: '',
      mes: '',
      ano: currentYear.toString(),
      status: '',
      sugestoes: '',
      busca: '',
    });
    router.push('/transacoes');
  };

  // Detectar se os filtros atuais são os padrão do inbox
  const isUsingInboxDefaults = () => {
    // Calcular mês anterior como padrão do inbox
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const inboxMonth = previousMonth.getMonth() + 1;
    const inboxYear = previousMonth.getFullYear();

    return (
      filters.categoria === '' &&
      filters.conta === '' &&
      filters.mes === inboxMonth.toString() &&
      filters.ano === inboxYear.toString() &&
      filters.status === '' &&
      filters.sugestoes === '' &&
      filters.busca === ''
    );
  };

  // Detectar se não há filtros aplicados
  const hasNoFilters = () => {
    return (
      filters.categoria === '' &&
      filters.conta === '' &&
      filters.mes === '' &&
      filters.ano === currentYear.toString() &&
      filters.status === '' &&
      filters.sugestoes === '' &&
      filters.busca === ''
    );
  };

  // Preparar opções para comboboxes
  const categoryOptions: ComboboxOption[] = categories
    .map((category) => {
      const displayName =
        category.level === 1
          ? category.name
          : `${category.parent?.name} > ${category.name}`;

      return {
        value: category.id,
        label: '  '.repeat(category.level - 1) + displayName,
        keywords: [category.name, category.parent?.name || ''].filter(Boolean),
      };
    })
    .sort((a, b) => {
      const aCategory = categories.find((c) => c.id === a.value)!;
      const bCategory = categories.find((c) => c.id === b.value)!;

      if (aCategory.level !== bCategory.level) {
        return aCategory.level - bCategory.level;
      }
      return aCategory.name.localeCompare(bCategory.name);
    });

  const bankAccountOptions: ComboboxOption[] = bankAccounts.map((account) => ({
    value: account.id,
    label: account.name,
    keywords: [account.name, account.bankName],
  }));

  const yearOptions: ComboboxOption[] = years.map((year) => ({
    value: year.toString(),
    label: year.toString(),
  }));

  const monthOptions: ComboboxOption[] = months.slice(1).map((month) => ({
    value: month.value,
    label: month.label,
  }));

  // const statusOptions: ComboboxOption[] = [
  //   { value: 'pendentes', label: 'Pendentes' },
  //   { value: 'revisados', label: 'Revisados' }
  // ]

  // Funções para navegação de mês
  const navigateMonth = (direction: 'prev' | 'next') => {
    const currentMonth = parseInt(filters.mes) || 1;
    const currentYear = parseInt(filters.ano);

    let newMonth = currentMonth;
    let newYear = currentYear;

    if (direction === 'prev') {
      if (currentMonth === 1) {
        newMonth = 12;
        newYear = currentYear - 1;
      } else {
        newMonth = currentMonth - 1;
      }
    } else {
      if (currentMonth === 12) {
        newMonth = 1;
        newYear = currentYear + 1;
      } else {
        newMonth = currentMonth + 1;
      }
    }

    // Atualizar ambos os filtros simultaneamente
    updateFilter('mes', newMonth.toString(), { ano: newYear.toString() });
  };

  // Obter nome do mês atual
  const getCurrentMonthName = () => {
    const monthNum = parseInt(filters.mes);
    if (!monthNum) return 'Todos os meses';

    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    return monthNames[monthNum - 1];
  };

  return (
    <div className="p-4 md:p-6">
      {/* Toolbar compacta */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-xl border bg-gradient-to-b from-gray-50 to-white p-3 md:p-4">
        {/* Navegação de período */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigateMonth('prev')}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            title="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="px-4 py-2 bg-white rounded-lg border text-center shadow-sm min-w-[150px]">
            <div className="text-sm font-semibold text-gray-900">
              {getCurrentMonthName()}
            </div>
            <div className="text-xs text-gray-500 font-medium">
              {filters.ano}
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

        {/* Ações rápidas */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              updateFilter(
                'status',
                filters.status === 'pendentes' ? '' : 'pendentes'
              )
            }
            variant={filters.status === 'pendentes' ? 'default' : 'outline'}
            size="sm"
            className={
              (filters.status === 'pendentes'
                ? 'bg-orange-600 hover:bg-orange-700 text-white border-orange-600 '
                : 'text-orange-600 border-orange-200 hover:bg-orange-50 ') +
              'rounded-full h-8 px-3'
            }
          >
            <FileText className="h-4 w-4 mr-1" />
            Pendentes
          </Button>

          <Button
            onClick={() =>
              updateFilter(
                'status',
                filters.status === 'revisados' ? '' : 'revisados'
              )
            }
            variant={filters.status === 'revisados' ? 'default' : 'outline'}
            size="sm"
            className={
              (filters.status === 'revisados'
                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 '
                : 'text-green-600 border-green-200 hover:bg-green-50 ') +
              'rounded-full h-8 px-3'
            }
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Revisados
          </Button>

          <Button
            onClick={() =>
              updateFilter(
                'sugestoes',
                filters.sugestoes === 'com-sugestoes' ? '' : 'com-sugestoes'
              )
            }
            variant={filters.sugestoes === 'com-sugestoes' ? 'default' : 'outline'}
            size="sm"
            className={
              (filters.sugestoes === 'com-sugestoes'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600 '
                : 'text-yellow-600 border-yellow-200 hover:bg-yellow-50 ') +
              'rounded-full h-8 px-3'
            }
          >
            <Lightbulb className="h-4 w-4 mr-1" />
            Com Sugestões
          </Button>

          <Button
            onClick={() =>
              updateFilter(
                'sugestoes',
                filters.sugestoes === 'aplicado-via-regra' ? '' : 'aplicado-via-regra'
              )
            }
            variant={filters.sugestoes === 'aplicado-via-regra' ? 'default' : 'outline'}
            size="sm"
            className={
              (filters.sugestoes === 'aplicado-via-regra'
                ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 '
                : 'text-purple-600 border-purple-200 hover:bg-purple-50 ') +
              'rounded-full h-8 px-3'
            }
          >
            <Zap className="h-4 w-4 mr-1" />
            Aplicado via Regra
          </Button>

          <Button
            onClick={clearAllFilters}
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-gray-600 hover:text-gray-900"
            title="Limpar todos os filtros"
          >
            Limpar
          </Button>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="mt-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            value={filters.busca}
            onChange={(e) => updateFilter('busca', e.target.value)}
            placeholder="Buscar por descrição, detalhes ou notas..."
            className="pl-10 pr-4 h-10 w-full"
          />
        </div>
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Filtro de Categoria */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Categoria
          </label>
          <Combobox
            options={categoryOptions}
            value={filters.categoria}
            onValueChange={(value) => updateFilter('categoria', value)}
            placeholder="Selecionar categoria"
            searchPlaceholder="Buscar categoria..."
            emptyMessage="Nenhuma categoria encontrada."
            clearLabel="Todas as categorias"
            className="w-full"
          />
        </div>

        {/* Filtro de Conta */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Conta Bancária
          </label>
          <Combobox
            options={bankAccountOptions}
            value={filters.conta}
            onValueChange={(value) => updateFilter('conta', value)}
            placeholder="Selecionar conta"
            searchPlaceholder="Buscar conta..."
            emptyMessage="Nenhuma conta encontrada."
            clearLabel="Todas as contas"
            className="w-full"
          />
        </div>

        {/* Filtro de Ano */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Ano
          </label>
          <Combobox
            options={yearOptions}
            value={filters.ano}
            onValueChange={(value) => updateFilter('ano', value)}
            placeholder="Selecionar ano"
            searchPlaceholder="Buscar ano..."
            emptyMessage="Nenhum ano encontrado."
            allowClear={false}
            className="w-full"
          />
        </div>

        {/* Filtro de Mês */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Mês
          </label>
          <Combobox
            options={monthOptions}
            value={filters.mes}
            onValueChange={(value) => updateFilter('mes', value)}
            placeholder="Selecionar mês"
            searchPlaceholder="Buscar mês..."
            emptyMessage="Nenhum mês encontrado."
            clearLabel="Todos os meses"
            className="w-full"
          />
        </div>
      </div>

      {/* Indicadores */}
      <div className="mt-5 flex items-center gap-3">
        {isUsingInboxDefaults() && (
          <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Inbox padrão ativo</span>
          </div>
        )}
        {hasNoFilters() && (
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span>Sem filtros</span>
          </div>
        )}
        {!isUsingInboxDefaults() && !hasNoFilters() && (
          <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>Filtros personalizados</span>
          </div>
        )}
      </div>
    </div>
  );
}
