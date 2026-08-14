'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import {
  getPayablesFormData,
  listMatchableDebitsAction,
  settleInstallmentAction,
} from '../actions';
import { formatCurrency } from '@/lib/formatters';
import { isoDate } from '@/lib/core/payables/dates';
import { paymentMethodLabels } from '@/lib/core/payables/labels';
import type { PayablePaymentMethod } from '@/app/generated/prisma';
import type { InstallmentListItem } from '@/lib/core/database/payables';
import { formatDateStringBR } from '@/lib/utils/date-helpers';

type MatchableDebit = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  bankAccountId: string;
  bankAccountName: string;
};

export function SettlementDialog({
  installment,
  onClose,
}: {
  installment: InstallmentListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(installment.remainingAmount));
  const [paidAt, setPaidAt] = useState(isoDate(new Date()));
  const [bankAccountId, setBankAccountId] = useState('');
  const [method, setMethod] = useState<PayablePaymentMethod>(
    installment.paymentMethod
  );
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [accounts, setAccounts] = useState<{ value: string; label: string }[]>(
    []
  );
  const [matches, setMatches] = useState<MatchableDebit[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPayablesFormData().then((data) => {
      setAccounts(
        data.bankAccounts.map((account) => ({
          value: account.id,
          label: account.name,
        }))
      );
    });
    listMatchableDebitsAction(
      installment.remainingAmount,
      isoDate(new Date(installment.dueDate))
    ).then(setMatches);
  }, [installment]);

  const submit = async () => {
    setLoading(true);
    setError('');
    const selectedMatch = matches.find((item) => item.id === transactionId);
    const result = await settleInstallmentAction({
      installmentId: installment.id,
      bankAccountId: selectedMatch?.bankAccountId || bankAccountId,
      amount: Number(amount.replace(',', '.')),
      paidAt,
      method,
      transactionId: transactionId || null,
      notes,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Baixar parcela</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            {installment.payable.vendor.name} · {installment.payable.description}
          </p>
          <p className="text-gray-600">
            Saldo: {formatCurrency(installment.remainingAmount)}
          </p>
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </div>
          )}
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
          />
          <Combobox
            options={accounts}
            value={bankAccountId}
            onValueChange={setBankAccountId}
            placeholder="Conta bancária"
            allowClear={false}
          />
          <Combobox
            options={Object.entries(paymentMethodLabels).map(([value, label]) => ({
              value,
              label,
            }))}
            value={method}
            onValueChange={(value) => setMethod(value as PayablePaymentMethod)}
            placeholder="Método"
            allowClear={false}
          />
          {matches.length > 0 && (
            <div className="space-y-2 rounded border p-3">
              <p className="font-medium">Débitos sugeridos</p>
              {matches.map((match) => (
                <label key={match.id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="tx"
                    checked={transactionId === match.id}
                    onChange={() => {
                      setTransactionId(match.id);
                      setBankAccountId(match.bankAccountId);
                    }}
                  />
                  <span>
                    {formatDateStringBR(isoDate(new Date(match.date)))} ·{' '}
                    {match.bankAccountName} · {match.description} ·{' '}
                    {formatCurrency(match.amount)}
                  </span>
                </label>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTransactionId('')}
              >
                Baixar sem transação
              </Button>
            </div>
          )}
          <Textarea
            placeholder="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={loading || !bankAccountId}>
            {loading ? 'Salvando...' : 'Confirmar baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
