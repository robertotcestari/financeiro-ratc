'use client';

import { useState } from 'react';
import { type ImobziInvoiceFormatted } from '@/lib/features/imobzi/invoices';
import { markImobziInvoiceAsPaid } from '../actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface PaymentModalProps {
  invoice: ImobziInvoiceFormatted | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function PaymentModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: PaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!invoice) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await markImobziInvoiceAsPaid(
        invoice.id,
        paymentDate,
        invoice
      );

      if (result.success) {
        onSuccess();
        onOpenChange(false);
        // Reset form
        setPaymentDate(new Date().toISOString().split('T')[0]);
      } else {
        setError(result.message || 'Erro ao quitar fatura');
      }
    } catch {
      setError('Erro inesperado ao processar quitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Quitar Fatura</DialogTitle>
          <DialogDescription>
            Confirme os dados da quitação da fatura. O pagamento será registrado na conta Sicredi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">Inquilino</Label>
            <p className="text-sm font-semibold">{invoice.tenantName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">Propriedade</Label>
            <p className="text-sm font-semibold">{invoice.propertyName}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">Valor</Label>
            <p className="text-lg font-bold text-green-600">
              R$ {invoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-500">Vencimento</Label>
            <p className="text-sm">
              {(() => {
                const [year, month, day] = invoice.dueDate.split('-').map(Number);
                return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
              })()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-date">Data do Pagamento</Label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={isSubmitting}
            />
          </div>

          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <strong>Conta:</strong> Sicredi - Ag. 3003 / C.C. 44319-0
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Confirmar Quitação'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
