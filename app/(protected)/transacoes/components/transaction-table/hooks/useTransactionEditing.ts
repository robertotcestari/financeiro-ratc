import { useState, useTransition, useCallback } from 'react';
import {
  categorizeOneAction,
  updateTransactionDetailsAction,
} from '../../../actions';
import type { Transaction, Property } from '../types';
import { useToast } from '@/hooks/use-toast';

export interface UseTransactionEditingReturn {
  editingId: string | null;
  editingCategory: string;
  editingProperty: string;
  editingDescription: string;
  isPending: boolean;
  startEdit: (transaction: Transaction) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setEditingCategory: (value: string) => void;
  setEditingProperty: (value: string) => void;
  setEditingDescription: (value: string) => void;
}

export function useTransactionEditing(
  properties: Property[]
): UseTransactionEditingReturn {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const { toast } = useToast();

  const startEdit = useCallback((transaction: Transaction) => {
    setEditingId(transaction.id);
    // Normalize pseudo "uncategorized" to empty selection in editor
    setEditingCategory(
      transaction.category?.id === 'uncategorized' ? '' : transaction.category.id
    );
    setEditingProperty(transaction.property?.code || '');
    // Use only details field for editing, not the description
    setEditingDescription(transaction.details || '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingCategory('');
    setEditingProperty('');
    setEditingDescription('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    startTransition(async () => {
      const propertyId = properties.find((p) => p.code === editingProperty)?.id;
      // Map pseudo "uncategorized" (or empty) to null for persistence
      const normalizedCategoryId =
        editingCategory && editingCategory !== 'uncategorized'
          ? editingCategory
          : null;
      // Save category/property
      const result = await categorizeOneAction({
        id: editingId,
        categoryId: normalizedCategoryId,
        propertyId,
      });
      if (!result?.success) {
        toast({
          variant: 'destructive',
          title: 'Não foi possível salvar',
          description: result?.error || 'Falha ao categorizar a transação',
        });
        return;
      }
      // Save description into processed details (acts as editable description)
      await updateTransactionDetailsAction({
        id: editingId,
        details: editingDescription,
      });
      cancelEdit();
    });
  }, [
    editingId,
    editingCategory,
    editingProperty,
    editingDescription,
    properties,
    cancelEdit,
    toast,
  ]);

  return {
    editingId,
    editingCategory,
    editingProperty,
    editingDescription,
    isPending,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditingCategory,
    setEditingProperty,
    setEditingDescription,
  };
}
