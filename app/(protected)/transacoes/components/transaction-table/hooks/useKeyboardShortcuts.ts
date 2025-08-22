import { useEffect } from 'react';
import type { Table, RowSelectionState } from '@tanstack/react-table';
import type { Transaction } from '../types';

interface UseKeyboardShortcutsProps {
  table: Table<Transaction>;
  rowSelection: RowSelectionState;
  setRowSelection: (selection: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  clearSelection: () => void;
}

export function useKeyboardShortcuts({
  table,
  rowSelection,
  setRowSelection,
  clearSelection,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // ESC - Clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
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
        setRowSelection(newSelection);
        return;
      }

      // Ctrl/Cmd + D - Deselect all
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Ctrl/Cmd + I - Invert selection
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        const allRows = table.getRowModel().rows;
        const currentSelection = rowSelection;
        const newSelection: RowSelectionState = {};
        allRows.forEach((row) => {
          if (!currentSelection[row.id]) {
            newSelection[row.id] = true;
          }
        });
        setRowSelection(newSelection);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [table, rowSelection, setRowSelection, clearSelection]);
}