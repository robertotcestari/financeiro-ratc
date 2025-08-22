import { useState, useTransition, useCallback } from 'react';
import { updateTransactionAction } from '../../actions';
import { toast } from 'sonner';

interface TransactionForEdit {
  id: string;
  description: string;
  amount: number;
}

export interface UseTransactionEditingReturn {
  editingId: string | null;
  editingDescription: string;
  editingAmount: string;
  originalSign: number;
  isPending: boolean;
  editingField: 'description' | 'amount' | null;
  startEdit: (transaction: TransactionForEdit, field?: 'description' | 'amount') => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  setEditingDescription: (value: string) => void;
  setEditingAmount: (value: string) => void;
}

export function useTransactionEditing(
  bankAccountId: string
): UseTransactionEditingReturn {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingAmount, setEditingAmount] = useState<string>('');
  const [originalSign, setOriginalSign] = useState<number>(1);
  const [editingField, setEditingField] = useState<'description' | 'amount' | null>(null);

  const startEdit = useCallback((transaction: TransactionForEdit, field: 'description' | 'amount' = 'description') => {
    // Don't allow editing virtual rows
    if (transaction.id === 'initial-balance' || transaction.id === 'final-balance') {
      return;
    }
    
    setEditingId(transaction.id);
    const description = transaction.description || '';
    const amount = Math.abs(transaction.amount).toString();
    
    setEditingDescription(description);
    setEditingAmount(amount);
    setOriginalSign(transaction.amount < 0 ? -1 : 1);
    setEditingField(field);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingDescription('');
    setEditingAmount('');
    setOriginalSign(1);
    setEditingField(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;

    const description = editingDescription.trim();
    const amountStr = editingAmount.replace(/[^\d.-]/g, '');
    const amount = parseFloat(amountStr);

    if (!description) {
      toast.error('Descrição não pode estar vazia');
      return;
    }

    if (isNaN(amount) || amount === 0) {
      toast.error('Valor inválido');
      return;
    }

    startTransition(async () => {
      // Preserve the original sign
      const finalAmount = originalSign < 0 ? -Math.abs(amount) : Math.abs(amount);

      const result = await updateTransactionAction(
        editingId,
        description,
        finalAmount,
        bankAccountId
      );

      if (result.success) {
        toast.success('Transação atualizada com sucesso');
        cancelEdit();
      } else {
        toast.error(result.error || 'Erro ao atualizar transação');
      }
    });
  }, [editingId, editingDescription, editingAmount, originalSign, bankAccountId, cancelEdit]);

  return {
    editingId,
    editingDescription,
    editingAmount,
    originalSign,
    isPending,
    editingField,
    startEdit,
    cancelEdit,
    saveEdit,
    setEditingDescription,
    setEditingAmount,
  };
}
