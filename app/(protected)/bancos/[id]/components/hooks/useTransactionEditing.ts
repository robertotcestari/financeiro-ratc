import { useState, useTransition } from 'react';
import { updateTransactionAction } from '../../actions';
import { toast } from 'sonner';

interface TransactionForEdit {
  id: string;
  description: string;
  amount: number;
}

export interface UseTransactionEditingReturn {
  isDialogOpen: boolean;
  editingTransaction: TransactionForEdit | null;
  isPending: boolean;
  openEditDialog: (transaction: TransactionForEdit) => void;
  closeEditDialog: () => void;
  saveTransaction: (id: string, description: string, amount: number) => Promise<void>;
}

export function useTransactionEditing(
  bankAccountId: string
): UseTransactionEditingReturn {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionForEdit | null>(null);

  const openEditDialog = (transaction: TransactionForEdit) => {
    if (transaction.id === 'initial-balance' || transaction.id === 'final-balance') {
      return;
    }
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const closeEditDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
  };

  const saveTransaction = async (id: string, description: string, amount: number) => {
    startTransition(async () => {
      const result = await updateTransactionAction(id, description, amount, bankAccountId);

      if (result.success) {
        toast.success('Transação atualizada com sucesso');
        closeEditDialog();
      } else {
        toast.error(result.error || 'Erro ao atualizar transação');
      }
    });
  };

  return {
    isDialogOpen,
    editingTransaction,
    isPending,
    openEditDialog,
    closeEditDialog,
    saveTransaction,
  };
}
