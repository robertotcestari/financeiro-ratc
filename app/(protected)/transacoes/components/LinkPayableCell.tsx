'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isoDate } from '@/lib/core/payables/dates';
import { formatCurrency } from '@/lib/formatters';
import { formatDateStringBR } from '@/lib/utils/date-helpers';
import {
  settleInstallmentAction,
  suggestInstallmentsForTransactionAction,
} from '@/app/(protected)/contas-a-pagar/actions';
import type { Transaction } from './transaction-table/types';

type Suggestion = {
  id: string;
  payableId: string;
  dueDate: Date;
  remainingAmount: number;
  description: string;
  vendorName: string;
  propertyCode: string | null;
};

export function LinkPayableCell({ transaction }: { transaction: Transaction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const raw = transaction.transaction;
  const isDebit = raw.amount < 0 && raw.id !== '—';

  useEffect(() => {
    if (!open) return;
    suggestInstallmentsForTransactionAction(
      raw.amount,
      isoDate(new Date(raw.date))
    ).then(setSuggestions);
  }, [open, raw.amount, raw.date]);

  if (transaction.payableLink) {
    return (
      <Link
        href={`/contas-a-pagar/${transaction.payableLink.payableId}`}
        className="text-[11px] text-blue-700 hover:underline"
        title={transaction.payableLink.description}
      >
        Pagar
      </Link>
    );
  }

  if (!isDebit) return null;

  const submit = async () => {
    if (!selectedId || !raw.bankAccountId) return;
    setLoading(true);
    setError('');
    const result = await settleInstallmentAction({
      installmentId: selectedId,
      bankAccountId: raw.bankAccountId,
      amount: Math.abs(raw.amount),
      paidAt: isoDate(new Date(raw.date)),
      transactionId: raw.id,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-gray-600"
        title="Vincular a conta a pagar"
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a conta a pagar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {raw.description} · {formatCurrency(raw.amount)}
            </p>
            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                {error}
              </div>
            )}
            {suggestions.length === 0 ? (
              <p className="text-gray-500">
                Nenhuma parcela em aberto com este valor.{' '}
                <Link href="/contas-a-pagar/nova" className="text-blue-700">
                  Cadastrar título
                </Link>
              </p>
            ) : (
              suggestions.map((item) => (
                <label key={item.id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="installment"
                    checked={selectedId === item.id}
                    onChange={() => setSelectedId(item.id)}
                  />
                  <span>
                    {item.vendorName} · {item.description} · vence{' '}
                    {formatDateStringBR(isoDate(new Date(item.dueDate)))} ·{' '}
                    {formatCurrency(item.remainingAmount)}
                    {item.propertyCode ? ` · ${item.propertyCode}` : ''}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!selectedId || loading}>
              {loading ? 'Salvando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
