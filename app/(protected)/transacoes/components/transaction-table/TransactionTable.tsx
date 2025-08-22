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

  // Stable data reference
  const data = useMemo(() => transactions, [transactions]);

  // Selection handling (Shift+clique)
  const tableRef = useRef<ReturnType<typeof useReactTable<Transaction>> | null>(
    null
  );
  const lastSelectedIndexRef = useRef<number | null>(null);

  const handleRowSelectClick = (
    e: React.MouseEvent<HTMLElement>,
    row: Row<Transaction>,
    fromCheckbox: boolean = false
  ) => {
    console.log('Entrou no handleRowSelect');

    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    const target = e.target as HTMLElement | null;
    try {
      console.log('[RowSelect:TTable] click', {
        rowId: row.id,
        shiftKey: e.shiftKey,
        fromCheckbox,
        tag: target?.tagName,
      });
    } catch {}

    const tableInst = tableRef.current;
    if (!tableInst) {
      console.log('ops');
      return;
    }

    const rows = tableInst.getRowModel().rows;
    const currentIndex = rows.findIndex((r) => r.id === row.id);

    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex);
      const end = Math.max(lastSelectedIndexRef.current, currentIndex);
      const targetSelected = !row.getIsSelected();
      const base = tableInst.getState().rowSelection as RowSelectionState;
      const newSelection: RowSelectionState = { ...base };
      for (let i = start; i <= end; i++) {
        const id = rows[i]?.id as string | undefined;
        if (!id) continue;
        if (targetSelected) newSelection[id] = true;
        else delete newSelection[id];
      }
      tableInst.setRowSelection(newSelection);
    } else {
      // Default click on a row (not from checkbox): single selection
      // First click selects the row; second click (when already solely selected) enters edit mode.
      if (!fromCheckbox) {
        const id = row.id as string;
        const current = tableInst.getState().rowSelection as RowSelectionState;
        const selectedIds = Object.keys(current);
        const isOnlyThisSelected = selectedIds.length === 1 && !!current[id];
        if (isOnlyThisSelected) {
          // Start editing this transaction on second click
          editing.startEdit?.(row.original);
        } else {
          // If navigating away from a different editing row, save it before switching selection
          if (editing.editingId && editing.editingId !== id) {
            try {
              editing.saveEdit();
            } catch {}
          }
          const newSelection: RowSelectionState = { [id]: true };
          tableInst.setRowSelection(newSelection);
        }
      } else {
        // Checkbox clicks maintain multi-select toggle behavior
        const id = row.id as string;
        const base = tableInst.getState().rowSelection as RowSelectionState;
        const newSelection: RowSelectionState = { ...base };
        if (row.getIsSelected()) delete newSelection[id];
        else newSelection[id] = true;
        tableInst.setRowSelection(newSelection);
      }
    }

    lastSelectedIndexRef.current = currentIndex;

    // Clear any accidental text selection for better DX
    try {
      const sel = window.getSelection?.();
      if (sel && typeof sel.removeAllRanges === 'function')
        sel.removeAllRanges();
    } catch {}
  };

  // Ensure a specific row is selected (used when entering edit via cell dblclick)
  // const ensureRowSelected = useCallback(
  //   (rowId: string) => {
  //     const tableInst = tableRef.current;
  //     if (!tableInst) return;

  //     const current = tableInst.getState().rowSelection as RowSelectionState;
  //     const isOnlyThisSelected =
  //       Object.keys(current).length === 1 && !!current[rowId];
  //     if (isOnlyThisSelected) return;

  //     // If switching from another editing row, save it first
  //     if (editing.editingId && editing.editingId !== rowId) {
  //       try {
  //         editing.saveEdit();
  //       } catch {}
  //     }

  //     tableInst.setRowSelection({ [rowId]: true });
  //   },
  //   [editing]
  // );

  // Prevent text selection on mousedown over non-interactive cells/rows
  const handleRowMouseDown = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest(
        'button, a, input, select, textarea, [role="button"], [contenteditable="true"], .no-row-select'
      )
    ) {
      return;
    }
    e.preventDefault();
  }, []);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      categoryOptions,
      propertyOptions,
      editing.editingId,
      editing.editingCategory,
      editing.editingProperty,
      editing.focusedField,
      editing.isPending,
      editing.setEditingCategory,
      editing.setEditingProperty,
      editing.setEditingDescription,
      editing.startEdit,
      editing.saveEdit,
      editing.cancelEdit,
      bulk.isPending,
      handleMarkReviewed,
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
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // ESC - Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        bulk.clearSelection();
        return;
      }

      // Ctrl/Cmd + A - Select all visible
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allRows = table.getRowModel().rows;
        const newSelection: RowSelectionState = {};
        allRows.forEach((row) => {
          newSelection[row.id] = true;
        });
        bulk.setRowSelection(newSelection);
        return;
      }

      // Ctrl/Cmd + D - Deselect all
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        bulk.clearSelection();
        return;
      }

      // Ctrl/Cmd + I - Invert selection
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        const allRows = table.getRowModel().rows;
        const currentSelection = bulk.rowSelection;
        const newSelection: RowSelectionState = {};
        allRows.forEach((row) => {
          if (!currentSelection[row.id]) {
            newSelection[row.id] = true;
          }
        });
        bulk.setRowSelection(newSelection);
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bulk, table]);

  // Close inline editing when the row gets deselected (e.g., via ESC or click elsewhere)
  // COMMENTED OUT: This was causing issues with combobox interaction
  // useEffect(() => {
  //   if (!editing.editingId) return;
  //   const stillSelected = !!bulk.rowSelection[editing.editingId];
  //   if (!stillSelected) {
  //     editing.cancelEdit();
  //   }
  // }, [bulk.rowSelection, editing]);

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
              return (
                <tr
                  key={row.id}
                  className={`
                    transition-colors duration-75 border-b border-gray-100
                    ${
                      isSelected
                        ? 'bg-blue-50 hover:bg-blue-100 ring-1 ring-inset ring-blue-200'
                        : isRentalWithoutProperty
                        ? 'bg-amber-50 hover:bg-amber-100 border-l-2 border-l-amber-400'
                        : isEvenRow
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-gray-50/50 hover:bg-gray-100/70'
                    }
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
