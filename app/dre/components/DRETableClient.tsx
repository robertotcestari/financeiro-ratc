'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Switch } from '@/components/ui/switch';

interface DRERow {
  id: string;
  name: string;
  level: number;
  lineType: 'DETAIL' | 'SUBTOTAL' | 'TOTAL' | 'SEPARATOR' | 'HEADER';
  isBold: boolean;
  monthlyAmounts: Record<number, number>;
  total?: number;
}

interface DRETableClientProps {
  year: number;
  selectedMonths: number[];
  rows: DRERow[];
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// IDs das seções que podem ser expandidas/colapsadas
const SECTION_IDS = {
  SALDOS_BANCARIOS: 'saldos-bancarios-header',
  RECEITAS_OPERACIONAIS: 'section-receitas-operacionais',
  DESPESAS_OPERACIONAIS: 'section-despesas-operacionais',
  RECEITAS_NAO_OPERACIONAIS: 'section-receitas-não-operacionais',
  DESPESAS_NAO_OPERACIONAIS: 'section-despesas-não-operacionais'
};

export function DRETableClient({ year, selectedMonths, rows }: DRETableClientProps) {
  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [SECTION_IDS.SALDOS_BANCARIOS]: false,
    [SECTION_IDS.RECEITAS_OPERACIONAIS]: false,
    [SECTION_IDS.DESPESAS_OPERACIONAIS]: false,
    [SECTION_IDS.RECEITAS_NAO_OPERACIONAIS]: false,
    [SECTION_IDS.DESPESAS_NAO_OPERACIONAIS]: false,
  });

  // Estado para controlar se deve mostrar categorias com valores zero
  const [showZeroValues, setShowZeroValues] = useState<boolean>(true);

  // Estado para controlar se todas as seções estão expandidas
  const [expandAll, setExpandAll] = useState<boolean>(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleAllSections = (expand: boolean) => {
    setExpandAll(expand);
    setExpandedSections(prev => {
      const newState = { ...prev };
      Object.keys(SECTION_IDS).forEach(key => {
        newState[SECTION_IDS[key as keyof typeof SECTION_IDS]] = expand;
      });
      return newState;
    });
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getCellClass = (lineType: string, isBold: boolean, rowId?: string) => {
    let classes = 'px-3 text-right border-b border-gray-200 text-xs';
    
    if (lineType === 'SEPARATOR') {
      return 'px-3 py-2 border-b border-gray-300';
    }
    
    // Padding vertical maior para headers (lvl1) e totais
    if (lineType === 'HEADER' || lineType === 'TOTAL') {
      classes += ' py-3';
    } else {
      classes += ' py-1';
    }
    
    if (isBold || lineType === 'SUBTOTAL' || lineType === 'TOTAL' || lineType === 'HEADER') {
      classes += ' font-bold';
    }
    
    // Estilo especial para linha de não categorizados
    if (rowId === 'nao-categorizados') {
      classes += ' bg-yellow-100 border-yellow-300';
    } else if (lineType === 'TOTAL') {
      classes += ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
    } else if (lineType === 'SUBTOTAL') {
      classes += ' bg-gray-50 font-semibold';
    } else if (lineType === 'HEADER') {
      classes += ' font-bold';
    }
    
    return classes;
  };

  const getNameCellClass = (lineType: string, isBold: boolean, rowId?: string) => {
    let classes = 'px-3 border-b border-gray-200 text-sm';
    
    if (lineType === 'SEPARATOR') {
      return 'px-3 py-2 border-b border-gray-300';
    }
    
    // Padding vertical maior para headers (lvl1) e totais
    if (lineType === 'HEADER' || lineType === 'TOTAL') {
      classes += ' py-3';
    } else {
      classes += ' py-1';
    }
    
    if (isBold || lineType === 'SUBTOTAL' || lineType === 'TOTAL' || lineType === 'HEADER') {
      classes += ' font-bold';
    }
    
    // Estilo especial para linha de não categorizados
    if (rowId === 'nao-categorizados') {
      classes += ' bg-yellow-100 border-yellow-300';
    } else if (lineType === 'TOTAL') {
      classes += ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
    } else if (lineType === 'SUBTOTAL') {
      classes += ' bg-gray-50 font-semibold';
    } else if (lineType === 'HEADER') {
      classes += ' font-bold';
    }
    
    return classes;
  };

  const getValueColor = (value: number, lineType: string) => {
    if (value === 0 || lineType === 'SEPARATOR') return 'text-gray-400';
    if (value > 0) return 'text-green-700';
    return 'text-red-700';
  };

  // Função para verificar se uma linha tem valores zero em todos os meses
  const hasOnlyZeroValues = (row: DRERow) => {
    if (row.lineType !== 'DETAIL') return false;
    
    const hasValues = selectedMonths.some(month => {
      const value = row.monthlyAmounts[month] || 0;
      return value !== 0;
    });
    
    return !hasValues;
  };

  // Função para determinar se uma linha deve ser exibida
  const getVisibleRows = () => {
    const visibleRows: DRERow[] = [];
    let currentSection: string | null = null;

    for (const row of rows) {
      // Sempre mostra separadores, subtotais e totais
      if (['SEPARATOR', 'SUBTOTAL', 'TOTAL'].includes(row.lineType)) {
        visibleRows.push(row);
        continue;
      }

      // Para headers, sempre mostra e atualiza a seção atual
      if (row.lineType === 'HEADER') {
        visibleRows.push(row);
        // Atualiza a seção atual se for uma seção com toggle
        if (Object.values(SECTION_IDS).includes(row.id)) {
          currentSection = row.id;
        } else {
          currentSection = null;
        }
        continue;
      }

      // Para linhas de detalhes, verifica se a seção está expandida
      if (row.lineType === 'DETAIL') {
        // Verifica se deve filtrar valores zero
        if (!showZeroValues && hasOnlyZeroValues(row)) {
          continue;
        }

        if (currentSection && expandedSections[currentSection]) {
          visibleRows.push(row);
        } else if (!currentSection) {
          // Se não está em uma seção com toggle, sempre mostra
          visibleRows.push(row);
        }
      }
    }

    return visibleRows;
  };

  // Função para renderizar o botão de toggle
  const renderToggleButton = (row: DRERow) => {
    const isToggleableSection = Object.values(SECTION_IDS).includes(row.id);
    
    if (!isToggleableSection || row.lineType !== 'HEADER') {
      return null;
    }

    const isExpanded = expandedSections[row.id];
    const Icon = isExpanded ? ChevronDownIcon : ChevronRightIcon;

    return (
      <button
        onClick={() => toggleSection(row.id)}
        className="inline-flex items-center justify-center w-5 h-5 mr-2 hover:bg-gray-200 rounded transition-colors"
        aria-label={isExpanded ? 'Esconder categorias' : 'Mostrar categorias'}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  // Obtém as linhas que devem ser exibidas
  const visibleRows = getVisibleRows();

  if (selectedMonths.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">Selecione ao menos um mês para visualizar o DRE</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Toggles para controle da visualização */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Switch
              checked={showZeroValues}
              onCheckedChange={setShowZeroValues}
            />
            <label className="cursor-pointer" onClick={() => setShowZeroValues(!showZeroValues)}>
              Mostrar todas as categorias
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={expandAll}
              onCheckedChange={toggleAllSections}
            />
            <label className="cursor-pointer" onClick={() => toggleAllSections(!expandAll)}>
              Expandir todas as seções
            </label>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left font-medium text-gray-900 sticky left-0 bg-gray-50 min-w-[300px]">
              </th>
              {selectedMonths.map(month => (
                <th key={month} className="px-3 py-3 text-center font-medium text-gray-900 min-w-[120px]">
                  <div className="flex flex-col">
                    <span>{year}</span>
                    <span className="text-sm">{MONTH_NAMES[month - 1]}</span>
                  </div>
                </th>
              ))}
              {selectedMonths.length > 1 && (
                <th className="px-3 py-3 text-center font-medium text-gray-900 min-w-[120px] bg-blue-50">
                  Total
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className={`${getNameCellClass(row.lineType, row.isBold, row.id)} sticky left-0 ${row.id === 'nao-categorizados' ? 'bg-yellow-100' : 'bg-white'}`}>
                  {row.lineType === 'SEPARATOR' ? (
                    <div className="h-2"></div>
                  ) : (
                    <div className="flex items-center">
                      {renderToggleButton(row)}
                      <span style={{ paddingLeft: `${Math.max(0, (row.lineType === 'SUBTOTAL' ? 1 : row.level - 1) * 16)}px` }}>
                        {row.name}
                      </span>
                    </div>
                  )}
                </td>
                {selectedMonths.map(month => {
                  const value = row.monthlyAmounts[month] || 0;
                  return (
                    <td 
                      key={month} 
                      className={`${getCellClass(row.lineType, row.isBold, row.id)} ${getValueColor(value, row.lineType)}`}
                    >
                      {row.lineType === 'SEPARATOR' ? '' : formatCurrency(value)}
                    </td>
                  );
                })}
                {selectedMonths.length > 1 && (
                  <td className={`${getCellClass(row.lineType, row.isBold, row.id)} ${row.id === 'nao-categorizados' ? 'bg-yellow-100' : 'bg-blue-50'} ${getValueColor(row.total || 0, row.lineType)}`}>
                    {row.lineType === 'SEPARATOR' ? '' : formatCurrency(row.total || 0)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}