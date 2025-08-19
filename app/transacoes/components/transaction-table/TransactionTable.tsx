'use client';

import { useMemo, useCallback, useTransition, useRef, useEffect } from 'react';
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
import { BulkActionsToolbar } from './toolbar/BulkActionsToolbar';
import { TransactionTableHeader } from './components/TransactionTableHeader';
import { TransactionTablePagination } from './components/TransactionTablePagination';
import { TransactionTableEmptyState } from './components/TransactionTableEmptyState';
import { createColumnDefinitions } from './utils/column-definitions';
import type { RowSelectionState, Row } from '@tanstack/react-table';
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
  const sortedCategories = useMemo(() => prepareCategories(categories), [categories]);

  const categoryOptions: ComboboxOption[] = useMemo(() => 
    sortedCategories.map(category => ({
      value: category.id,
      label: '  '.repeat(category.level - 1) + category.displayName,
      keywords: [category.name, category.parent?.name || ''].filter(Boolean)
    })),
    [sortedCategories]
  );

  const propertyOptions: ComboboxOption[] = useMemo(() => 
    properties.map(property => ({
      value: property.code,
      label: `${property.code} - ${property.city}`,
      keywords: [property.code, property.city]
    })),
    [properties]
  );

  // Custom hooks for functionality
  const editing = useTransactionEditing(properties);
  const bulk = useBulkOperations(properties, transactions);
  const ai = useAISuggestions(bulk.setRowSelection);

  // Handle mark reviewed
  const handleMarkReviewed = useCallback(async (id: string, reviewed: boolean) => {
    startTransition(async () => {
      await markReviewedAction({ id, reviewed });
    });
  }, []);

  // Stable data reference
  const data = useMemo(() => transactions, [transactions]);

  // Selection handling (Shift+clique)
  const tableRef = useRef<ReturnType<typeof useReactTable> | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);

  const handleRowSelectClick = useCallback(
    (e: React.MouseEvent<any>, row: Row<any>, fromCheckbox: boolean = false) => {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      const target = e.target as HTMLElement | null;
      try { console.log('[RowSelect:TTable] click', { rowId: row.id, shiftKey: (e as any).shiftKey, fromCheckbox, tag: target?.tagName }); } catch {}

      if (
        !fromCheckbox &&
        target &&
        target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"], .no-row-select')
      ) {
        return;
      }

      const tableInst = tableRef.current;
      if (!tableInst) return;

      const rows = tableInst.getRowModel().rows;
      const currentIndex = rows.findIndex((r) => r.id === row.id);

      if ((e as any).shiftKey && lastSelectedIndexRef.current !== null) {
        const start = Math.min(lastSelectedIndexRef.current, currentIndex);
        const end = Math.max(lastSelectedIndexRef.current, currentIndex);
        const targetSelected = !row.getIsSelected();
        const base = tableInst.getState().rowSelection as RowSelectionState;
        const newSelection: RowSelectionState = { ...base };
        for (let i = start; i <= end; i++) {
          const id = rows[i]?.id as string | undefined;
          if (!id) continue;
          if (targetSelected) newSelection[id] = true; else delete newSelection[id];
        }
        tableInst.setRowSelection(newSelection);
      } else {
        // @ts-expect-error present at runtime
        if (typeof row.toggleSelected === 'function') {
          // @ts-expect-error present at runtime
          row.toggleSelected(!row.getIsSelected());
        } else {
          const id = row.id as string;
          const base = tableInst.getState().rowSelection as RowSelectionState;
          const newSelection: RowSelectionState = { ...base };
          if (row.getIsSelected()) delete newSelection[id]; else newSelection[id] = true;
          tableInst.setRowSelection(newSelection);
        }
      }

      lastSelectedIndexRef.current = currentIndex;

      // Clear any accidental text selection for better DX
      try {
        const sel = (window as any).getSelection?.();
        if (sel && typeof sel.removeAllRanges === 'function') sel.removeAllRanges();
      } catch {}
    },
    []
  );

  // Prevent text selection on mousedown over non-interactive cells/rows
  const handleRowMouseDown = useCallback((e: React.MouseEvent<any>) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest('button, a, input, select, textarea, [role="button"], [contenteditable="true"], .no-row-select')
    ) {
      return;
    }
    e.preventDefault();
  }, []);

  // Column definitions
  const columns = useMemo(() => 
    createColumnDefinitions({
      categoryOptions,
      propertyOptions,
      editingId: editing.editingId,
      editingCategory: editing.editingCategory,
      editingProperty: editing.editingProperty,
      isPending: editing.isPending || bulk.isPending,
      setEditingCategory: editing.setEditingCategory,
      setEditingProperty: editing.setEditingProperty,
      startEdit: editing.startEdit,
      saveEdit: editing.saveEdit,
      cancelEdit: editing.cancelEdit,
      handleMarkReviewed,
      onSelectClick: handleRowSelectClick,
    }),
    [
      categoryOptions,
      propertyOptions,
      editing.editingId,
      editing.editingCategory,
      editing.editingProperty,
      editing.isPending,
      editing.setEditingCategory,
      editing.setEditingProperty,
      editing.startEdit,
      editing.saveEdit,
      editing.cancelEdit,
      bulk.isPending,
      handleMarkReviewed,
      handleRowSelectClick,
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
  tableRef.current = table;

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

  // Clear selection on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        bulk.clearSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bulk.clearSelection]);

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
            {table.getRowModel().rows.map(row => {
              // Check if this is a rental transaction without property
              const isRentalWithoutProperty = 
                (row.original.category.name === 'Aluguel' || 
                 row.original.category.name === 'Aluguel de Terceiros' ||
                 row.original.category.name === 'Repasse de Aluguel' ||
                 row.original.category.name === 'Aluguel Pago') && 
                !row.original.property;
              
              const isSelected = row.getIsSelected();
              return (
                <tr 
                  key={row.id} 
                  className={`hover:bg-gray-50 ${
                    isSelected
                      ? 'bg-blue-50'
                      : (isRentalWithoutProperty ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : '')
                  }`}
                  aria-selected={isSelected}
                  onMouseDown={handleRowMouseDown}
                  onClick={(e) => handleRowSelectClick(e, row)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-3 py-1.5"
                      onMouseDown={handleRowMouseDown}
                      onClick={(e) => handleRowSelectClick(e, row)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
