import { useState, useTransition, useCallback } from 'react';
import { bulkCategorizeAction, bulkDeleteTransactionsAction } from '../../../actions';
import type { Property, Transaction } from '../types';
import type { RowSelectionState } from '@tanstack/react-table';

export interface UseBulkOperationsReturn {
  rowSelection: RowSelectionState;
  bulkCategory: string;
  bulkProperty: string;
  isPending: boolean;
  setRowSelection: (value: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => void;
  setBulkCategory: (value: string) => void;
  setBulkProperty: (value: string) => void;
  handleBulkCategorize: () => Promise<void>;
  handleBulkApplyProperty: () => Promise<void>;
  handleBulkMarkReviewed: () => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  clearSelection: () => void;
}

export function useBulkOperations(
  properties: Property[],
  transactions: Transaction[]
): UseBulkOperationsReturn {
  const [isPending, startTransition] = useTransition();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkProperty, setBulkProperty] = useState<string>('');

  const handleBulkCategorize = useCallback(async () => {
    if (!bulkCategory || Object.keys(rowSelection).length === 0) return;

    startTransition(async () => {
      await bulkCategorizeAction({
        ids: Object.keys(rowSelection),
        categoryId: bulkCategory,
        // Não enviar propertyId aqui; ação dedicada faz isso
        markReviewed: false,
      });
      setRowSelection({});
      setBulkCategory('');
      setBulkProperty('');
    });
  }, [bulkCategory, rowSelection]);

  const handleBulkApplyProperty = useCallback(async () => {
    if (!bulkProperty || Object.keys(rowSelection).length === 0) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === bulkProperty)?.id;
      if (!propertyId) return;
      await bulkCategorizeAction({
        ids: Object.keys(rowSelection),
        propertyId,
      });
      setRowSelection({});
      setBulkProperty('');
    });
  }, [bulkProperty, rowSelection, properties]);

  const handleBulkMarkReviewed = useCallback(async () => {
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
  }, [rowSelection, bulkCategory, transactions]);

  const handleBulkDelete = useCallback(async () => {
    if (Object.keys(rowSelection).length === 0) return;

    startTransition(async () => {
      const result = await bulkDeleteTransactionsAction({
        ids: Object.keys(rowSelection),
      });
      
      if (result.success) {
        setRowSelection({});
      }
    });
  }, [rowSelection]);

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  return {
    rowSelection,
    bulkCategory,
    bulkProperty,
    isPending,
    setRowSelection,
    setBulkCategory,
    setBulkProperty,
    handleBulkCategorize,
    handleBulkApplyProperty,
    handleBulkMarkReviewed,
    handleBulkDelete,
    clearSelection,
  };
}
