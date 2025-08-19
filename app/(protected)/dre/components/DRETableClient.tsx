'use client';

import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender,
  type ExpandedState,
  type ColumnDef,
} from '@tanstack/react-table';
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

// IDs das seções que podem ser expandidas/colapsadas
const SECTION_IDS = {
  SALDOS_BANCARIOS: 'saldos-bancarios-header',
  RECEITAS_OPERACIONAIS: 'section-receitas-operacionais',
  DESPESAS_OPERACIONAIS: 'section-despesas-operacionais',
  RECEITAS_NAO_OPERACIONAIS: 'section-receitas-não-operacionais',
  DESPESAS_NAO_OPERACIONAIS: 'section-despesas-não-operacionais',
};

export function DRETableClient({
  year,
  selectedMonths,
  rows,
}: DRETableClientProps) {
  // Estado para controlar quais seções estão expandidas
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
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

  // TanStack Table expanded state
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleAllSections = (expand: boolean) => {
    setExpandAll(expand);
    setExpandedSections((prev) => {
      const newState = { ...prev };
      Object.keys(SECTION_IDS).forEach((key) => {
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

    if (
      isBold ||
      lineType === 'SUBTOTAL' ||
      lineType === 'TOTAL' ||
      lineType === 'HEADER'
    ) {
      classes += ' font-bold';
    }

    // Estilo especial para linha de não categorizados
    if (rowId === 'nao-categorizados') {
      classes += ' bg-yellow-100 border-yellow-300';
    } else if (lineType === 'TOTAL') {
      classes +=
        ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
    } else if (lineType === 'SUBTOTAL') {
      classes += ' bg-gray-50 font-semibold';
    } else if (lineType === 'HEADER') {
      classes += ' font-bold';
    }

    return classes;
  };

  const getNameCellClass = (
    lineType: string,
    isBold: boolean,
    rowId?: string
  ) => {
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

    if (
      isBold ||
      lineType === 'SUBTOTAL' ||
      lineType === 'TOTAL' ||
      lineType === 'HEADER'
    ) {
      classes += ' font-bold';
    }

    // Estilo especial para linha de não categorizados
    if (rowId === 'nao-categorizados') {
      classes += ' bg-yellow-100 border-yellow-300';
    } else if (lineType === 'TOTAL') {
      classes +=
        ' bg-blue-50 border-t border-gray-400 border-b-2 border-gray-400';
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

    const hasValues = selectedMonths.some((month) => {
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

  // Column helper for creating columns
  // Create a column helper for the DRERow type. Column value types will be
  // treated as unknown in the ColumnDef array below to allow different
  // accessor return types (string | number).
  const columnHelper = createColumnHelper<DRERow>();
  // Alias a column type that permits any value type. Using `any` here for
  // the TValue avoids the complex generic incompatibilities between
  // AccessorKeyColumnDef/AccessorFnColumnDef with different return types.
  // This is safe because cells ultimately render strings/numbers.
  // Use unknown for TValue to avoid `any` but allow casting from specific
  // accessor column defs (string | number) when necessary.
  type TableColumn = ColumnDef<DRERow, unknown>;

  // Create columns dynamically based on selected months
  const columns = useMemo<TableColumn[]>(() => {
    const cols: TableColumn[] = [
      // Name column
      columnHelper.accessor('name', {
        id: 'name',
        header: '',
        cell: ({ row }) => {
          const rowData = row.original;
          if (rowData.lineType === 'SEPARATOR') {
            return <div className="h-2"></div>;
          }

          return (
            <div className="flex items-center">
              {renderToggleButton(rowData)}
              <span
                style={{
                  paddingLeft: `${Math.max(
                    0,
                    (rowData.lineType === 'SUBTOTAL' ? 1 : rowData.level - 1) *
                      16
                  )}px`,
                }}
              >
                {rowData.name}
              </span>
            </div>
          );
        },
        enableSorting: false,
      }) as TableColumn,
    ];

    // Add month columns
    selectedMonths.forEach((month) => {
      cols.push(
        columnHelper.accessor((row) => row.monthlyAmounts[month] || 0, {
          id: `month-${month}`,
          header: () => (
            <div className="flex flex-col">
              <span>{year}</span>
              <span className="text-sm">{MONTH_NAMES[month - 1]}</span>
            </div>
          ),
          cell: ({ getValue, row }) => {
            const value = getValue() as number;
            const rowData = row.original;
            if (rowData.lineType === 'SEPARATOR') return '';
            return (
              <span className={getValueColor(value, rowData.lineType)}>
                {formatCurrency(value)}
              </span>
            );
          },
          enableSorting: false,
        }) as TableColumn
      );
    });

    // Add total column if more than one month
    if (selectedMonths.length > 1) {
      cols.push(
        columnHelper.accessor('total', {
          id: 'total',
          header: 'Total',
          cell: ({ getValue, row }) => {
            const value = getValue() || 0;
            const rowData = row.original;
            if (rowData.lineType === 'SEPARATOR') return '';
            return (
              <span className={getValueColor(value, rowData.lineType)}>
                {formatCurrency(value)}
              </span>
            );
          },
          enableSorting: false,
        }) as TableColumn
      );
    }

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonths, year]);

  // Filter rows based on visibility settings
  const filteredData = useMemo(() => {
    return getVisibleRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, expandedSections, showZeroValues]);

  // Create table instance
  // Provide the row type generic so the table types align with the column helpers
  const table = useReactTable<DRERow>({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: {
      expanded,
    },
    onExpandedChange: setExpanded,
    enableSorting: false,
    manualSorting: true,
  });

  if (selectedMonths.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center">
          Selecione ao menos um mês para visualizar o DRE
        </p>
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
            <label
              className="cursor-pointer"
              onClick={() => setShowZeroValues(!showZeroValues)}
            >
              Mostrar todas as categorias
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={expandAll} onCheckedChange={toggleAllSections} />
            <label
              className="cursor-pointer"
              onClick={() => toggleAllSections(!expandAll)}
            >
              Expandir todas as seções
            </label>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="bg-gray-50 border-b border-gray-200"
              >
                {headerGroup.headers.map((header, index) => (
                  <th
                    key={header.id}
                    className={`px-3 py-3 font-medium text-gray-900 ${
                      index === 0
                        ? 'text-left sticky left-0 bg-gray-50 min-w-[300px]'
                        : index === headerGroup.headers.length - 1 &&
                          selectedMonths.length > 1
                        ? 'text-center min-w-[120px] bg-blue-50'
                        : 'text-center min-w-[120px]'
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell, index) => {
                  const rowData = row.original;
                  const isNameCell = index === 0;
                  const isTotalCell =
                    index === row.getVisibleCells().length - 1 &&
                    selectedMonths.length > 1;

                  return (
                    <td
                      key={cell.id}
                      className={`${
                        isNameCell
                          ? `${getNameCellClass(
                              rowData.lineType,
                              rowData.isBold,
                              rowData.id
                            )} sticky left-0 ${
                              rowData.id === 'nao-categorizados'
                                ? 'bg-yellow-100'
                                : 'bg-white'
                            }`
                          : `${getCellClass(
                              rowData.lineType,
                              rowData.isBold,
                              rowData.id
                            )} ${
                              isTotalCell && rowData.id === 'nao-categorizados'
                                ? 'bg-yellow-100'
                                : isTotalCell
                                ? 'bg-blue-50'
                                : ''
                            }`
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
