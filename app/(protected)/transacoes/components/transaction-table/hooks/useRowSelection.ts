import { useRef, useCallback } from 'react';
import type { Row, RowSelectionState } from '@tanstack/react-table';
import type { Transaction } from '../types';

interface UseRowSelectionProps {
  tableRef: React.MutableRefObject<ReturnType<typeof import('@tanstack/react-table').useReactTable<Transaction>> | null>;
  editing: {
    editingId: string | null;
    startEdit: (transaction: Transaction) => void;
    saveEdit: (overrides?: { category?: string; property?: string; details?: string }) => Promise<void>;
  };
}

export function useRowSelection({ tableRef, editing }: UseRowSelectionProps) {
  const lastSelectedIndexRef = useRef<number | null>(null);

  // Helper to clear text selection for better UX
  const clearTextSelection = () => {
    try {
      const sel = window.getSelection?.();
      if (sel && typeof sel.removeAllRanges === 'function') {
        sel.removeAllRanges();
      }
    } catch {}
  };

  // Handle shift+click multi-selection
  const handleShiftSelection = useCallback((
    currentIndex: number,
    row: Row<Transaction>,
    rows: Row<Transaction>[]
  ) => {
    const tableInst = tableRef.current;
    if (!tableInst || lastSelectedIndexRef.current === null) return false;

    const start = Math.min(lastSelectedIndexRef.current, currentIndex);
    const end = Math.max(lastSelectedIndexRef.current, currentIndex);
    const targetSelected = !row.getIsSelected();
    const base = tableInst.getState().rowSelection as RowSelectionState;
    const newSelection: RowSelectionState = { ...base };
    
    for (let i = start; i <= end; i++) {
      const id = rows[i]?.id as string | undefined;
      if (!id) continue;
      if (targetSelected) {
        newSelection[id] = true;
      } else {
        delete newSelection[id];
      }
    }
    
    tableInst.setRowSelection(newSelection);
    return true;
  }, [tableRef]);

  // Handle single row selection
  const handleSingleRowSelection = useCallback((
    row: Row<Transaction>,
    fromCheckbox: boolean
  ) => {
    const tableInst = tableRef.current;
    if (!tableInst) return;

    const id = row.id as string;
    const current = tableInst.getState().rowSelection as RowSelectionState;

    if (!fromCheckbox) {
      // Regular row click - single selection behavior
      const selectedIds = Object.keys(current);
      const isOnlyThisSelected = selectedIds.length === 1 && !!current[id];
      
      if (isOnlyThisSelected) {
        // Second click on already selected row - start editing
        editing.startEdit(row.original);
      } else {
        // Save current edit if switching to different row
        if (editing.editingId && editing.editingId !== id) {
          try {
            editing.saveEdit();
          } catch {}
        }
        // Select only this row
        const newSelection: RowSelectionState = { [id]: true };
        tableInst.setRowSelection(newSelection);
      }
    } else {
      // Checkbox click - toggle selection
      const base = tableInst.getState().rowSelection as RowSelectionState;
      const newSelection: RowSelectionState = { ...base };
      
      if (row.getIsSelected()) {
        delete newSelection[id];
      } else {
        newSelection[id] = true;
      }
      
      tableInst.setRowSelection(newSelection);
    }
  }, [editing, tableRef]);

  // Main row selection handler
  const handleRowSelectClick = useCallback(
    (
      e: React.MouseEvent<HTMLElement>,
      row: Row<Transaction>,
      fromCheckbox: boolean = false
    ) => {
      console.log('Entrou no handleRowSelect');

      if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
      
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

      // Handle shift+click for multi-selection
      if (e.shiftKey && lastSelectedIndexRef.current !== null) {
        const handled = handleShiftSelection(currentIndex, row, rows);
        if (handled) {
          lastSelectedIndexRef.current = currentIndex;
          clearTextSelection();
          return;
        }
      }

      // Handle single row selection
      handleSingleRowSelection(row, fromCheckbox);
      lastSelectedIndexRef.current = currentIndex;
      clearTextSelection();
    },
    [editing, tableRef, handleShiftSelection, handleSingleRowSelection]
  );

  // Prevent text selection on mousedown
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

  return {
    handleRowSelectClick,
    handleRowMouseDown,
  };
}