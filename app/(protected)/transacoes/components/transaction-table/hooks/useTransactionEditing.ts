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
  optimisticUpdates: Map<string, {
    categoryId?: string | null;
    propertyId?: string | null;
    details?: string | null;
  }>;
  startEdit: (transaction: Transaction, field?: 'details' | 'category' | 'property') => void;
  cancelEdit: () => void;
  saveEdit: (overrides?: { category?: string; property?: string; details?: string }) => Promise<void>;
  setEditingCategory: (value: string) => void;
  setEditingProperty: (value: string) => void;
  setEditingDescription: (value: string) => void;
}

export function useTransactionEditing(
  properties: Property[]
): UseTransactionEditingReturn {
  const [isPending] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingProperty, setEditingProperty] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'details' | 'category' | 'property'>('details');
  // Live ref to avoid re-rendering the whole table on each keystroke
  const editingDescriptionRef = useRef<string>('');
  const { toast } = useToast();
  
  // Store initial values to detect changes
  const initialValuesRef = useRef<{
    category: string;
    property: string;
    details: string;
  }>({ category: '', property: '', details: '' });
  
  // Store optimistic updates to immediately reflect changes in UI
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, {
    categoryId?: string | null;
    propertyId?: string | null;
    details?: string | null;
  }>>(new Map());

  const startEdit = useCallback((transaction: Transaction, field: 'details' | 'category' | 'property' = 'details') => {
    // If already editing this transaction, just change the focus field
    if (editingId === transaction.id) {
      setFocusedField(field);
      return;
    }
    
    setEditingId(transaction.id);
    setFocusedField(field);
    // Normalize pseudo "uncategorized" to empty selection in editor
    const categoryValue = transaction.category?.id === 'uncategorized' ? '' : (transaction.category?.id || '');
    const propertyValue = transaction.property?.code || '';
    const detailsValue = transaction.details || '';
    
    setEditingCategory(categoryValue);
    setEditingProperty(propertyValue);
    setEditingDescription(detailsValue);
    editingDescriptionRef.current = detailsValue;
    
    // Store initial values to detect changes
    initialValuesRef.current = {
      category: categoryValue,
      property: propertyValue,
      details: detailsValue,
    };
  }, [editingId]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingCategory('');
    setEditingProperty('');
    setEditingDescription('');
    editingDescriptionRef.current = '';
    setFocusedField('details');
  }, []);

  const saveEdit = useCallback(async (overrides?: { category?: string; property?: string; details?: string }) => {
    // Use overrides if provided, otherwise use current editing values
    const categoryToSave = overrides?.category !== undefined ? overrides.category : editingCategory;
    const propertyToSave = overrides?.property !== undefined ? overrides.property : editingProperty;
    const detailsToSave = overrides?.details !== undefined ? overrides.details : editingDescriptionRef.current;
    
    if (!editingId) return;
    
    const initial = initialValuesRef.current;
    
    const hasActualChanges = 
      categoryToSave !== initial.category ||
      propertyToSave !== initial.property ||
      detailsToSave !== initial.details;
    
    // If no changes, just cancel the edit without saving
    if (!hasActualChanges) {
      cancelEdit();
      return;
    }

    const propertyId = properties.find((p) => p.code === propertyToSave)?.id;
    const normalizedCategoryId =
      categoryToSave && categoryToSave !== 'uncategorized'
        ? categoryToSave
        : null;

    // Apply optimistic update immediately
    setOptimisticUpdates(prev => {
      const updates = new Map(prev);
      updates.set(editingId, {
        categoryId: normalizedCategoryId,
        propertyId,
        details: detailsToSave,
      });
      return updates;
    });

    // Close the editor immediately for better UX
    const currentEditingId = editingId;
    cancelEdit();

    // Perform the actual save in the background
    try {
      
      // Save category/property
      const result = await categorizeOneAction({
        id: currentEditingId,
        categoryId: normalizedCategoryId,
        propertyId,
      });
      
      if (!result?.success) {
        // Revert optimistic update on failure
        setOptimisticUpdates(prev => {
          const updates = new Map(prev);
          updates.delete(currentEditingId);
          return updates;
        });
        
        toast({
          variant: 'destructive',
          title: 'Não foi possível salvar',
          description: result?.error || 'Falha ao categorizar a transação',
        });
        return;
      }
      
      // Save description
      const detailsResult = await updateTransactionDetailsAction({ 
        id: currentEditingId, 
        details: detailsToSave 
      });
      
      if (!detailsResult?.success) {
        // Revert optimistic update on failure
        setOptimisticUpdates(prev => {
          const updates = new Map(prev);
          updates.delete(currentEditingId);
          return updates;
        });
        
        toast({
          variant: 'destructive',
          title: 'Não foi possível salvar',
          description: 'Falha ao salvar os detalhes da transação',
        });
        return;
      }
      
      // Remove optimistic update after successful save
      // The revalidatePath will update with real data
      setOptimisticUpdates(prev => {
        const updates = new Map(prev);
        updates.delete(currentEditingId);
        return updates;
      });
      
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticUpdates(prev => {
        const updates = new Map(prev);
        updates.delete(currentEditingId);
        return updates;
      });
      
      console.error('Error saving edit:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as alterações',
      });
    }
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
    optimisticUpdates,
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
