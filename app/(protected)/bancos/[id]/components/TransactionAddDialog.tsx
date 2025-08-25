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

interface TransactionAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (description: string, amount: number, date: Date) => Promise<void>;
  isLoading: boolean;
}

export function TransactionAddDialog({
  isOpen,
  onClose,
  onSave,
  isLoading,
}: TransactionAddDialogProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{description?: string; amount?: string; date?: string}>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setErrors({});
    }
  }, [isOpen]);

  const handleSave = async () => {
    const newErrors: {description?: string; amount?: string; date?: string} = {};

    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount === 0) {
      newErrors.amount = 'Valor inválido';
    }

    if (!date) {
      newErrors.date = 'Data é obrigatória';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const transactionDate = new Date(date + 'T12:00:00');
    await onSave(description.trim(), numericAmount, transactionDate);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
          <DialogTitle>Adicionar Nova Transação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              placeholder="Ex: Pagamento de conta"
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
              placeholder="Ex: -100.00 (negativo para saída)"
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Use valores negativos para saídas e positivos para entradas
            </p>
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={errors.date ? 'border-red-500' : ''}
            />
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}