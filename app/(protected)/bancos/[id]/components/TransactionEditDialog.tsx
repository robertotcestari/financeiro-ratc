'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TransactionEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
  };
  onSave: (id: string, description: string, amount: number) => Promise<void>;
  isLoading: boolean;
}

export function TransactionEditDialog({
  isOpen,
  onClose,
  transaction,
  onSave,
  isLoading,
}: TransactionEditDialogProps) {
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(Math.abs(transaction.amount).toString());
  const [errors, setErrors] = useState<{description?: string; amount?: string}>({});

  // Reset form when transaction changes
  useEffect(() => {
    if (isOpen) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setErrors({});
    }
  }, [isOpen, transaction]);

  const handleSave = async () => {
    const newErrors: {description?: string; amount?: string} = {};

    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      newErrors.amount = 'Valor inválido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    // Use the sign from the user's input, not the original transaction
    const finalAmount = numericAmount;
    await onSave(transaction.id, description.trim(), finalAmount);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              autoFocus
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => {
                // Allow numbers, decimal point, and minus sign at the beginning
                const newValue = e.target.value.replace(/[^-\d.]/g, '');
                // Ensure minus sign can only be at the beginning
                const cleanValue = newValue.replace(/(.)-+/g, '$1').replace(/^-+/, '-');
                setAmount(cleanValue);
              }}
              placeholder="0.00"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}