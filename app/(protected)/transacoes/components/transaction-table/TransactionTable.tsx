'use client';
'use no memo';

import { useMemo, useCallback, useTransition, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { markReviewedAction } from '../../actions';
import { useTransactionEditing } from './hooks/useTransactionEditing';
import { useBulkOperations } from './hooks/useBulkOperations';
import { useAISuggestions } from './hooks/useAISuggestions';
import { useRowSelection } from './hooks/useRowSelection';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { applyOptimisticUpdates } from './utils/optimistic-updates';
import { BulkActionsToolbar } from './toolbar/BulkActionsToolbar';
import { TransactionTableHeader } from './components/TransactionTableHeader';
import { TransactionTablePagination } from './components/TransactionTablePagination';
import { TransactionTableEmptyState } from './components/TransactionTableEmptyState';
import { createColumnDefinitions } from './utils/column-definitions';
import type { Transaction } from './types';
import { prepareCategories } from './utils/transaction-helpers';
import type { TransactionTableProps } from './types';
import type { ComboboxOption } from '@/components/ui/combobox';

export default function TransactionTable({
  transactions,
  currentPage,
  totalPages,
  totalCount,
  categories = [],
  properties = [],
}: TransactionTableProps) {
  const [, startTransition] = useTransition();

  // Prepare options for comboboxes
  const sortedCategories = useMemo(
    () => prepareCategories(categories),
    [categories]
  );

  const categoryOptions: ComboboxOption[] = useMemo(
    () =>
      sortedCategories.map((category) => ({
        value: category.id,
        label: '  '.repeat(category.level - 1) + category.displayName,
        keywords: [category.name, category.parent?.name || ''].filter(Boolean),
      })),
    [sortedCategories]
  );

  const propertyOptions: ComboboxOption[] = useMemo(
    () =>
      properties.map((property) => ({
        value: property.code,
        label: `${property.code} - ${property.city}`,
        keywords: [property.code, property.city],
      })),
    [properties]
  );

  // Custom hooks for functionality
  const editing = useTransactionEditing(properties);
  const bulk = useBulkOperations(properties, transactions);
  const ai = useAISuggestions(bulk.setRowSelection);

  // Handle mark reviewed
  const handleMarkReviewed = useCallback(
    async (id: string, reviewed: boolean) => {
      startTransition(async () => {
        await markReviewedAction({ id, reviewed });
      });
    },
    []
  );

  // Apply optimistic updates to transactions
  const data = useMemo(
    () => applyOptimisticUpdates(transactions, editing.optimisticUpdates, categories, properties),
    [transactions, editing.optimisticUpdates, categories, properties]
  );

  // Table ref for selection handling
  const tableRef = useRef<ReturnType<typeof useReactTable<Transaction>> | null>(
    null
  );

  // Use row selection hook
  const { handleRowSelectClick, handleRowMouseDown } = useRowSelection({
    tableRef,
    editing,
  });

  // Column definitions
  const columns = useMemo(
    () =>
      createColumnDefinitions({
        categoryOptions,
        propertyOptions,
        editingId: editing.editingId,
        editingCategory: editing.editingCategory,
        editingProperty: editing.editingProperty,
        isPending: editing.isPending || bulk.isPending,
        focusedField: editing.focusedField,
        optimisticUpdates: editing.optimisticUpdates,
        setEditingCategory: editing.setEditingCategory,
        setEditingProperty: editing.setEditingProperty,
        setEditingDescription: editing.setEditingDescription,
        startEdit: editing.startEdit,
        saveEdit: editing.saveEdit,
        cancelEdit: editing.cancelEdit,
        handleMarkReviewed,
        onSelectClick: handleRowSelectClick,
        // ensureRowSelected,
      }),
    [
      categoryOptions,
      propertyOptions,
      editing.editingId,
      editing.editingCategory,
      editing.editingProperty,
      editing.focusedField,
      editing.isPending,
      editing.optimisticUpdates,
      editing.setEditingCategory,
      editing.setEditingProperty,
      editing.setEditingDescription,
      editing.startEdit,
      editing.saveEdit,
      editing.cancelEdit,
      bulk.isPending,
      handleMarkReviewed,
      handleRowSelectClick,
      // ensureRowSelected,
    ]
  );

  // Table configuration
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: bulk.setRowSelection,
    getRowId: (row) => row.id,
    state: {
      rowSelection: bulk.rowSelection,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: 200,
      },
    },
    pageCount: totalPages,
    manualPagination: true,
  });
  // Expose table instance for selection handler
  tableRef.current = table as unknown as ReturnType<
    typeof useReactTable<Transaction>
  >;

  // Handlers for AI suggestions
  const handleGenerateSuggestions = useCallback(async () => {
    const selectedIds = Object.keys(bulk.rowSelection);
    await ai.handleGenerateSuggestions(selectedIds);
  }, [bulk.rowSelection, ai]);

  const handleGenerateAISuggestions = useCallback(async () => {
    const selectedIds = Object.keys(bulk.rowSelection);
    await ai.handleGenerateAISuggestions(selectedIds);
  }, [bulk.rowSelection, ai]);

  const handleApplySuggestions = useCallback(async () => {
    await ai.handleApplySuggestions(table);
  }, [table, ai]);

  const handleDismissSuggestions = useCallback(async () => {
    await ai.handleDismissSuggestions(table);
  }, [table, ai]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    table,
    rowSelection: bulk.rowSelection,
    setRowSelection: bulk.setRowSelection,
    clearSelection: bulk.clearSelection,
  });


  if (transactions.length === 0) {
    return <TransactionTableEmptyState />;
  }

  return (
    <div className="overflow-hidden">
      <BulkActionsToolbar
        rowSelection={bulk.rowSelection}
        table={table}
        isGeneratingAI={ai.isGeneratingAI}
        isPending={bulk.isPending || ai.isPending}
        categoryOptions={categoryOptions}
        propertyOptions={propertyOptions}
        bulkCategory={bulk.bulkCategory}
        bulkProperty={bulk.bulkProperty}
        setBulkCategory={bulk.setBulkCategory}
        setBulkProperty={bulk.setBulkProperty}
        handleGenerateSuggestions={handleGenerateSuggestions}
        handleGenerateAISuggestions={handleGenerateAISuggestions}
        handleApplySuggestions={handleApplySuggestions}
        handleDismissSuggestions={handleDismissSuggestions}
        handleBulkCategorize={bulk.handleBulkCategorize}
        handleBulkMarkReviewed={bulk.handleBulkMarkReviewed}
        handleBulkDelete={bulk.handleBulkDelete}
        clearSelection={bulk.clearSelection}
      />

      <TransactionTableHeader
        currentPage={currentPage}
        totalPages={totalPages}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse table-fixed">
          <thead className="bg-gray-50 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-1 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200"
                    style={{
                      width: `${header.getSize()}px`,
                      minWidth: `${header.getSize()}px`,
                      maxWidth: `${header.getSize()}px`,
                    }}
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
          <tbody className="bg-white">
            {table.getRowModel().rows.map((row, index) => {
              // Check if this category requires a property and it's missing
              const requiresProperty =
                row.original.category.name === 'Aluguel' ||
                row.original.category.name === 'Aluguel de Terceiros' ||
                row.original.category.name === 'Repasse de Aluguel' ||
                row.original.category.name === 'Aluguel Pago' ||
                row.original.category.name === 'Manutenção';
              const isRentalWithoutProperty =
                requiresProperty && !row.original.property;

              const isSelected = row.getIsSelected();
              const isEvenRow = index % 2 === 0;
              const hasPendingUpdate = editing.optimisticUpdates.has(row.original.id);
              
              return (
                <tr
                  key={row.id}
                  className={`
                    transition-all duration-200 border-b border-gray-100
                    ${hasPendingUpdate ? 'opacity-75 animate-pulse' : ''}
                    ${
                      isSelected
                        ? 'bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-200'
                        : isRentalWithoutProperty
                        ? 'bg-amber-50 hover:bg-amber-100 border-l-2 border-l-amber-400'
                        : isEvenRow
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50/50 hover:bg-gray-100/70'
                    }
                    ${hasPendingUpdate && !isSelected ? 'border-l-2 border-l-blue-400' : ''}
                  `}
                  aria-selected={isSelected}
                  onMouseDown={handleRowMouseDown}
                  onClick={(e) => {
                    // Don't trigger row selection if clicking on interactive elements
                    // const target = e.target as HTMLElement;
                    // if (
                    //   target.closest(
                    //     '[role="combobox"], [data-slot="popover-trigger"], button, input, textarea, select, .no-row-select'
                    //   )
                    // ) {
                    //   console.log(
                    //     '[RowSelect:TTable] click ignored due to interactive element',
                    //     { tag: target?.tagName }
                    //   );
                    //   return;
                    // }
                    handleRowSelectClick(e, row);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-2 py-1 text-[11px] overflow-hidden"
                      style={{
                        width: `${cell.column.getSize()}px`,
                        minWidth: `${cell.column.getSize()}px`,
                        maxWidth: `${cell.column.getSize()}px`,
                      }}
                      onMouseDown={handleRowMouseDown}
                      onClick={(e) => {
                        // Don't trigger row selection if clicking on interactive elements
                        const target = e.target as HTMLElement;
                        if (
                          target.closest(
                            '[role="combobox"], [data-slot="popover-trigger"], button, input, textarea, select, .no-row-select'
                          )
                        ) {
                          return;
                        }
                        handleRowSelectClick(e, row);
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TransactionTablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  );
}
