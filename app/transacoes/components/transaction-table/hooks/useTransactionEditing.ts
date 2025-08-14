import { useState, useTransition, useCallback } from 'react';
import { categorizeOneAction } from '../../../actions';
import type { Transaction, Property } from '../types';

export interface UseTransactionEditingReturn {
  editingId: string | null;
  editingCategory: string;
  editingProperty: string;
  isPending: boolean;
  startEdit: (transaction: Transaction) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setEditingCategory: (value: string) => void;
  setEditingProperty: (value: string) => void;
}

export function useTransactionEditing(
  properties: Property[]
): UseTransactionEditingReturn {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<string>('');

  const startEdit = useCallback((transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditingCategory(transaction.category.id);
    setEditingProperty(transaction.property?.code || '');
  }, []);

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

  return {
    editingId,
    editingCategory,
    editingProperty,
    isPending,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditingCategory,
    setEditingProperty,
  };
}