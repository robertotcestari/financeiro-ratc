'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type React from 'react';
import { useState, useTransition, useMemo, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  categorizeOneAction,
  bulkCategorizeAction,
  markReviewedAction,
  generateSuggestionsAction,
  applySuggestionsAction,
  generateBulkAISuggestionsAction,
} from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
  type Row,
} from '@tanstack/react-table';
import SuggestionIndicator from './SuggestionIndicator';

interface Suggestion {
  id: string;
  confidence: number;
  createdAt: Date;
  rule: {
    id: string;
    name: string;
    description?: string;
  };
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

interface Transaction {
  id: string;
  year: number;
  month: number;
  details: string | null;
  notes: string | null;
  isReviewed: boolean;
  isPending: boolean;
  transaction: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    bankAccount: {
      name: string;
      bankName: string;
    };
  };
  category: {
    id: string;
    name: string;
    type: string;
    parent: {
      name: string;
    } | null;
  };
  property: {
    code: string;
    city: string;
  } | null;
  suggestions: Suggestion[];
}

interface Category {
  id: string;
  name: string;
  level: number;
  parent: { name: string } | null;
}

interface Property {
  id: string;
  code: string;
  city: string;
}

interface Props {
  transactions: Transaction[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  categories?: Category[];
  properties?: Property[];
}

const columnHelper = createColumnHelper<Transaction>();

export default function TransactionTableV2({
  transactions,
  currentPage,
  totalPages,
  totalCount,
  categories = [],
  properties = [],
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<string>('');
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkProperty, setBulkProperty] = useState<string>('');

  // Prepare options for comboboxes
  const groupedCategories = categories.reduce((acc, category) => {
    const categoryDisplay =
      category.level === 1
        ? category.name
        : `${category.parent?.name} > ${category.name}`;

    if (!acc[category.level]) {
      acc[category.level] = [];
    }
    acc[category.level].push({
      ...category,
      displayName: categoryDisplay,
    });
    return acc;
  }, {} as Record<number, Array<Category & { displayName: string }>>);

  const sortedCategories = Object.keys(groupedCategories)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .flatMap((level) => groupedCategories[parseInt(level)]);

  const categoryOptions: ComboboxOption[] = sortedCategories.map(category => ({
    value: category.id,
    label: '  '.repeat(category.level - 1) + category.displayName,
    keywords: [category.name, category.parent?.name || ''].filter(Boolean)
  }));

  const propertyOptions: ComboboxOption[] = properties.map(property => ({
    value: property.code,
    label: `${property.code} - ${property.city}`,
    keywords: [property.code, property.city]
  }));

  // Stable data reference
  const data = useMemo(() => transactions, [transactions]);

  // Column definitions
  const columns = useMemo<ColumnDef<Transaction>[]>(() => [
    // Selection column
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-gray-300 w-4 h-4"
        />
      ),
      cell: ({ row }) => (
        <Input
          type="checkbox"
          checked={row.getIsSelected()}
          // Use onClick to support Shift range selection; suppress default onChange
          onClick={(e) => handleRowSelectClick(e, row, true)}
          onChange={() => {}}
          className="rounded border-gray-300 w-4 h-4"
        />
      ),
      enableSorting: false,
      size: 40,
    }),

    // Suggestion indicator column
    columnHelper.display({
      id: 'suggestions',
      header: 'Sugestão',
      cell: ({ row }) => <SuggestionIndicator transaction={row.original} />,
      enableSorting: false,
      size: 60,
    }),

    // Date column
    columnHelper.accessor('transaction.date', {
      id: 'date',
      header: 'Data',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 leading-tight">
          {formatDate(getValue())}
        </div>
      ),
      sortingFn: 'datetime',
      size: 100,
    }),

    // Description column
    columnHelper.accessor('transaction.description', {
      id: 'description',
      header: 'Descrição',
      cell: ({ getValue, row }) => (
        <div className="text-[11px] text-gray-900 leading-tight py-1">
          <div className="break-words">
            {getValue()}
          </div>
          {row.original.details && (
            <div className="text-[10px] text-gray-500 mt-0.5 break-words">
              {row.original.details}
            </div>
          )}
        </div>
      ),
      size: 200,
    }),

    // Bank account column
    columnHelper.accessor('transaction.bankAccount.name', {
      id: 'account',
      header: 'Conta',
      cell: ({ getValue, row }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 leading-tight">
          <div>{getValue()}</div>
          <div className="text-[11px] text-gray-500">
            {row.original.transaction.bankAccount.bankName}
          </div>
        </div>
      ),
      size: 120,
    }),

    // Type column
    columnHelper.accessor('category.type', {
      id: 'type',
      header: 'Tipo',
      cell: ({ getValue }) => {
        const getTypeColor = (type: string) => {
          switch (type) {
            case 'INCOME':
              return 'text-green-600 bg-green-50';
            case 'EXPENSE':
              return 'text-red-600 bg-red-50';
            case 'TRANSFER':
              return 'text-blue-600 bg-blue-50';
            case 'ADJUSTMENT':
              return 'text-yellow-600 bg-yellow-50';
            default:
              return 'text-gray-600 bg-gray-50';
          }
        };

        const getTypeLabel = (type: string) => {
          switch (type) {
            case 'INCOME':
              return 'Receita';
            case 'EXPENSE':
              return 'Despesa';
            case 'TRANSFER':
              return 'Transf.';
            case 'ADJUSTMENT':
              return 'Ajuste';
            default:
              return type;
          }
        };

        return (
          <span
            className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getTypeColor(
              getValue()
            )}`}
          >
            {getTypeLabel(getValue())}
          </span>
        );
      },
      size: 80,
    }),

    // Category column
    columnHelper.accessor('category', {
      id: 'category',
      header: 'Categoria',
      cell: ({ getValue, row }) => {
        const category = getValue();
        
        if (editingId === row.id) {
          return (
            <Combobox
              options={categoryOptions}
              value={editingCategory}
              onValueChange={setEditingCategory}
              placeholder="Selecionar categoria"
              searchPlaceholder="Buscar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
              allowClear={false}
              compact={true}
              className="w-full"
            />
          );
        }

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {category.parent && (
              <div className="text-[9px] text-gray-400 leading-tight mb-0.5">
                {category.parent.name}
              </div>
            )}
            <div className="text-xs text-gray-900">
              {category.name}
            </div>
          </div>
        );
      },
      size: 180,
    }),

    // Property column
    columnHelper.accessor('property', {
      id: 'property',
      header: 'Propriedade',
      cell: ({ getValue, row }) => {
        const property = getValue();
        
        if (editingId === row.id) {
          return (
            <Combobox
              options={propertyOptions}
              value={editingProperty}
              onValueChange={setEditingProperty}
              placeholder="Selecionar propriedade"
              searchPlaceholder="Buscar propriedade..."
              emptyMessage="Nenhuma propriedade encontrada."
              clearLabel="Nenhuma"
              compact={true}
              className="w-full"
            />
          );
        }

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {property ? (
              <div>
                <div className="font-medium">
                  {property.code}
                </div>
                <div className="text-[11px] text-gray-500">
                  {property.city}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        );
      },
      size: 120,
    }),

    // Amount column
    columnHelper.accessor('transaction.amount', {
      id: 'amount',
      header: 'Valor',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-right leading-tight">
          <div
            className={`font-medium ${
              getValue() >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(getValue())}
          </div>
        </div>
      ),
      size: 120,
    }),

    // Status column
    columnHelper.accessor('isReviewed', {
      id: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <div className="flex flex-col items-center space-y-0.5">
          {getValue() ? (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
              Revisado
            </span>
          ) : (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
              Pendente
            </span>
          )}
        </div>
      ),
      size: 100,
    }),

    // Actions column
    columnHelper.display({
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          {editingId === row.id ? (
            <>
              <Button
                onClick={saveEdit}
                disabled={isPending}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800"
              >
                Salvar
              </Button>
              <Button
                onClick={cancelEdit}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => startEdit(row.original)}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800"
              >
                Editar
              </Button>
              {!row.original.isReviewed && (
                <Button
                  onClick={() =>
                    handleMarkReviewed(row.original.id, true)
                  }
                  disabled={isPending}
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-800"
                >
                  ✓
                </Button>
              )}
            </>
          )}
        </div>
      ),
      enableSorting: false,
      size: 120,
    }),
  ], [editingId, editingCategory, editingProperty, isPending, categoryOptions, propertyOptions, saveEdit, cancelEdit]);

  // Table configuration
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    state: {
      rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 200,
      },
    },
    pageCount: totalPages,
    manualPagination: true,
  });

  // Track last clicked row index for Shift range selection
  const lastSelectedIndexRef = useRef<number | null>(null);

  const handleRowSelectClick = useCallback(
    (e: React.MouseEvent<any>, row: Row<Transaction>, fromCheckbox: boolean = false) => {
      // Avoid bubbling to row click (e.g., when clicking checkbox)
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      // Ignore clicks from interactive elements inside the row
      const target = e.target as HTMLElement | null;
      try {
        // Debug logs
        // eslint-disable-next-line no-console
        console.log('[RowSelect] click', {
          rowId: row.id,
          shiftKey: e.shiftKey,
          fromCheckbox,
          targetTag: target?.tagName,
          targetClasses: target?.className,
        });
      } catch {}
      if (
        !fromCheckbox &&
        target &&
        target.closest(
          'button, a, input, select, textarea, [role="button"], [contenteditable="true"], .no-row-select'
        )
      ) {
        // eslint-disable-next-line no-console
        console.log('[RowSelect] ignored due to interactive target');
        return;
      }
      const rows = table.getRowModel().rows;
      const currentIndex = rows.findIndex((r) => r.id === row.id);
      // eslint-disable-next-line no-console
      console.log('[RowSelect] currentIndex', currentIndex, 'lastIndex', lastSelectedIndexRef.current);

      if (e.shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, currentIndex);
        const end = Math.max(lastSelectedIndexRef.current, currentIndex);
        const targetSelected = !row.getIsSelected();
        const base = table.getState().rowSelection as RowSelectionState;
        const newSelection: RowSelectionState = { ...base };
        for (let i = start; i <= end; i++) {
          const id = rows[i]?.id;
          if (!id) continue;
          if (targetSelected) {
            newSelection[id] = true;
          } else {
            delete newSelection[id];
          }
        }
        table.setRowSelection(newSelection);
        // eslint-disable-next-line no-console
        console.log('[RowSelect] range applied', { start, end, selected: targetSelected, size: Object.keys(newSelection).length });
      } else {
        // Toggle via table API to ensure consistency
        // If toggleSelected is available, use it; otherwise, fall back to state update
        // @ts-expect-error: toggleSelected exists on TanStack row instances
        if (typeof row.toggleSelected === 'function') {
          // @ts-expect-error: exists at runtime
          row.toggleSelected(!row.getIsSelected());
          // eslint-disable-next-line no-console
          console.log('[RowSelect] toggled via row.toggleSelected', { to: !row.getIsSelected() });
        } else {
          const id = row.id;
          const base = table.getState().rowSelection as RowSelectionState;
          const newSelection: RowSelectionState = { ...base };
          if (row.getIsSelected()) {
            delete newSelection[id];
          } else {
            newSelection[id] = true;
          }
          table.setRowSelection(newSelection);
          // eslint-disable-next-line no-console
          console.log('[RowSelect] toggled via setRowSelection', { id, to: !row.getIsSelected() });
        }
      }

      lastSelectedIndexRef.current = currentIndex;
      // eslint-disable-next-line no-console
      console.log('[RowSelect] lastSelectedIndexRef set to', currentIndex);
    },
    [rowSelection, table]
  );

  // Helper functions
  const startEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditingCategory(transaction.category.id);
    setEditingProperty(transaction.property?.code || '');
  };

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingCategory('');
    setEditingProperty('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || !editingCategory) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === editingProperty)?.id;
      await categorizeOneAction({
        id: editingId,
        categoryId: editingCategory,
        propertyId,
      });
      cancelEdit();
    });
  }, [editingId, editingCategory, editingProperty, properties, cancelEdit]);

  const handleMarkReviewed = async (id: string, reviewed: boolean) => {
    startTransition(async () => {
      await markReviewedAction({ id, reviewed });
    });
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory || Object.keys(rowSelection).length === 0) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === bulkProperty)?.id;
      await bulkCategorizeAction({
        ids: Object.keys(rowSelection),
        categoryId: bulkCategory,
        propertyId,
        markReviewed: false,
      });
      setRowSelection({});
      setBulkCategory('');
      setBulkProperty('');
    });
  };

  const handleBulkMarkReviewed = async () => {
    if (Object.keys(rowSelection).length === 0) return;

    startTransition(async () => {
      await bulkCategorizeAction({
        ids: Object.keys(rowSelection),
        categoryId:
          bulkCategory ||
          transactions.find((t) => rowSelection[t.id])?.category.id ||
          '',
        markReviewed: true,
      });
      setRowSelection({});
    });
  };

  const handleGenerateSuggestions = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      await generateSuggestionsAction({ transactionIds: selectedIds });
      setRowSelection({});
    });
  };

  const handleGenerateAISuggestions = async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) return;

    setIsGeneratingAI(true);
    toast.info(`Enviando ${selectedIds.length} transações para análise de IA...`, {
      duration: 10000,
      id: 'ai-generating',
    });

    try {
      const result = await generateBulkAISuggestionsAction({ transactionIds: selectedIds });
      if (result.success) {
        toast.success(result.message || `${result.suggested} sugestões criadas para ${result.processed} transações`, {
          id: 'ai-generating',
        });
        setRowSelection({});
      } else {
        toast.error(result.error || "Ocorreu um erro ao gerar as sugestões de IA", {
          id: 'ai-generating',
        });
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast.error("Ocorreu um erro inesperado. Verifique o console para mais detalhes.", {
        id: 'ai-generating',
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleApplySuggestions = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const suggestionIds = selectedRows
      .flatMap(row => row.original.suggestions)
      .map(suggestion => suggestion.id);
      
    if (suggestionIds.length === 0) return;

    startTransition(async () => {
      await applySuggestionsAction({ suggestionIds });
      setRowSelection({});
    });
  };

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/transacoes?${params.toString()}`);
  };

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedWithSuggestions = selectedRows.filter(row => 
    row.original.suggestions?.length > 0
  );

  return (
    <div className="overflow-hidden">
      {/* Bulk actions bar */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {Object.keys(rowSelection).length}{' '}
                {Object.keys(rowSelection).length === 1
                  ? 'transação selecionada'
                  : 'transações selecionadas'}
              </span>

              <Button
                onClick={handleGenerateSuggestions}
                disabled={isPending || isGeneratingAI}
                variant="default"
                size="sm"
              >
                Gerar Sugestões ({Object.keys(rowSelection).length})
              </Button>

              <Button
                onClick={handleGenerateAISuggestions}
                disabled={isPending || isGeneratingAI}
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>Gerar Sugestões IA ({Object.keys(rowSelection).length})</>
                )}
              </Button>

              {selectedWithSuggestions.length > 0 && (
                <Button
                  onClick={handleApplySuggestions}
                  disabled={isPending || isGeneratingAI}
                  variant="default"
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Aplicar Sugestões ({selectedWithSuggestions.length})
                </Button>
              )}

              <Combobox
                options={categoryOptions}
                value={bulkCategory}
                onValueChange={setBulkCategory}
                placeholder="Selecione categoria..."
                searchPlaceholder="Buscar categoria..."
                emptyMessage="Nenhuma categoria encontrada."
                clearLabel="Selecione categoria..."
                className="w-64 text-sm"
              />

              <Combobox
                options={propertyOptions}
                value={bulkProperty}
                onValueChange={setBulkProperty}
                placeholder="Propriedade (opcional)"
                searchPlaceholder="Buscar propriedade..."
                emptyMessage="Nenhuma propriedade encontrada."
                clearLabel="Propriedade (opcional)"
                className="w-48 text-sm"
              />

              <Button
                onClick={handleBulkCategorize}
                disabled={!bulkCategory || isPending || isGeneratingAI}
                variant="default"
                size="sm"
              >
                Aplicar Categoria
              </Button>

              <Button
                onClick={handleBulkMarkReviewed}
                disabled={isPending || isGeneratingAI}
                variant="default"
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                Marcar como Revisado
              </Button>
            </div>

            <Button
              onClick={() => setRowSelection({})}
              variant="ghost"
              size="sm"
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Table header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Transações</h3>
          <div className="text-sm text-gray-500">
            Página {currentPage} de {totalPages}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto px-6">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-3 py-1.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider"
                    style={{ width: `${header.getSize()}px` }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? 'cursor-pointer select-none'
                            : '',
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={`hover:bg-gray-50 ${row.getIsSelected() ? 'bg-blue-50' : ''}`}
                onClick={(e) => handleRowSelectClick(e, row)}
                aria-selected={row.getIsSelected()}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-3 py-1.5"
                    onClick={(e) => handleRowSelectClick(e, row)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Mostrando {(currentPage - 1) * 200 + 1} até{' '}
              {Math.min(currentPage * 200, totalCount)} de{' '}
              {totalCount.toLocaleString('pt-BR')} transações
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Anterior
              </Button>

              {/* Pages */}
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Próximo
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {transactions.length === 0 && (
        <div className="px-6 py-12 text-center">
          <div className="text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma transação encontrada
            </p>
            <p className="text-gray-500">
              Tente ajustar os filtros ou verifique se há dados importados no
              sistema.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
