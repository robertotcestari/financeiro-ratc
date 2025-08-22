import { useState, useTransition, useCallback, useRef } from 'react';
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
  focusedField: 'details' | 'category' | 'property';
  isPending: boolean;
  startEdit: (transaction: Transaction, field?: 'details' | 'category' | 'property') => void;
  cancelEdit: () => void;
  saveEdit: (overrideDetails?: string) => Promise<void>;
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
  const [focusedField, setFocusedField] = useState<'details' | 'category' | 'property'>('details');
  // Live ref to avoid re-rendering the whole table on each keystroke
  const editingDescriptionRef = useRef<string>('');
  const { toast } = useToast();

  const startEdit = useCallback((transaction: Transaction, field: 'details' | 'category' | 'property' = 'details') => {
    try { console.log('[Editing] startEdit', { id: transaction.id, field }); } catch {}
    setEditingId(transaction.id);
    setFocusedField(field);
    // Normalize pseudo "uncategorized" to empty selection in editor
    setEditingCategory(
      transaction.category?.id === 'uncategorized' ? '' : transaction.category.id
    );
    setEditingProperty(transaction.property?.code || '');
    // Use only details field for editing, not the description
    const initial = transaction.details || '';
    setEditingDescription(initial);
    editingDescriptionRef.current = initial;
  }, []);

  const cancelEdit = useCallback(() => {
    try { console.log('[Editing] cancelEdit'); } catch {}
    setEditingId(null);
    setEditingCategory('');
    setEditingProperty('');
    setEditingDescription('');
    editingDescriptionRef.current = '';
    setFocusedField('details');
  }, []);

  const saveEdit = useCallback(async (overrideDetails?: string) => {
    if (!editingId) return;

    startTransition(async () => {
      try { console.log('[Editing] saveEdit', { id: editingId }); } catch {}
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
      const detailsToSave =
        overrideDetails !== undefined
          ? overrideDetails
          : editingDescriptionRef.current;
      await updateTransactionDetailsAction({ id: editingId, details: detailsToSave });
      cancelEdit();
    });
  }, [
    editingId,
    editingCategory,
    editingProperty,
    properties,
    cancelEdit,
    toast,
  ]);

  return {
    editingId,
    editingCategory,
    editingProperty,
    editingDescription,
    focusedField,
    isPending,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditingCategory,
    setEditingProperty,
    setEditingDescription: (v: string) => {
      // Update ref to keep the latest value without forcing re-renders
      editingDescriptionRef.current = v;
      // Intentionally avoid setState here to keep typing fluid
    },
  };
}
