'use client';

import { useState } from 'react';
import { type ImobziInvoiceFormatted } from '@/lib/features/imobzi/invoices';
import { type TransactionMatch } from '../actions';
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
import { Loader2, CheckCircle } from 'lucide-react';

interface MatchConfirmationModalProps {
  invoice: ImobziInvoiceFormatted | null;
  match: TransactionMatch | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function MatchConfirmationModal({
  invoice,
  match,
  open,
  onOpenChange,
  onSuccess,
}: MatchConfirmationModalProps) {
  const [paymentDate, setPaymentDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update payment date when match changes
  if (match && !paymentDate) {
    const matchDate = new Date(match.transactionDate);
    setPaymentDate(matchDate.toISOString().split('T')[0]);
  }

  const handleSubmit = async () => {
    if (!invoice || !match) return;

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
        setPaymentDate('');
      } else {
        setError(result.message || 'Erro ao quitar fatura');
      }
    } catch (err) {
      setError('Erro inesperado ao processar quitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!invoice || !match) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirmar Quitação com Match</DialogTitle>
          <DialogDescription>
            Verifique se a transação corresponde corretamente à fatura antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Fatura Imobzi */}
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900">Fatura Imobzi</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-blue-700">Inquilino</Label>
                  <p className="text-sm font-medium">{invoice.tenantName}</p>
                </div>
                <div>
                  <Label className="text-xs text-blue-700">Propriedade</Label>
                  <p className="text-sm">{invoice.propertyName}</p>
                </div>
                <div>
                  <Label className="text-xs text-blue-700">Valor</Label>
                  <p className="text-sm font-bold">
                    R$ {invoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-blue-700">Vencimento</Label>
                  <p className="text-sm">
                    {(() => {
                      const [year, month, day] = invoice.dueDate.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Transação Correspondente */}
            <div className="space-y-3 p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold text-green-900">Transação Encontrada</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-green-700">Descrição</Label>
                  <p className="text-sm">{match.transactionDescription}</p>
                </div>
                <div>
                  <Label className="text-xs text-green-700">Valor</Label>
                  <p className="text-sm font-bold">
                    R$ {match.transactionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-green-700">Data</Label>
                  <p className="text-sm">
                    {new Date(match.transactionDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-green-700">Match por</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {match.matchedBy.map((criteria, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {criteria}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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