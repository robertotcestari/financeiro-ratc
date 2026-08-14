'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import { formatDateStringBR } from '@/lib/utils/date-helpers';
import { isoDate } from '@/lib/core/payables/dates';
import {
  installmentStatusLabels,
  paymentMethodLabels,
  payableStatusLabels,
} from '@/lib/core/payables/labels';
import {
  cancelPayableAction,
  deletePayableAttachmentAction,
  reverseSettlementAction,
  uploadPayableAttachmentAction,
} from '../actions';
import { SettlementDialog } from './SettlementDialog';
import type { serializePayable } from '@/lib/core/database/payables';

type PayableDetail = NonNullable<Awaited<ReturnType<typeof serializePayable>>>;

export function PayableDetail({ payable }: { payable: PayableDetail }) {
  const router = useRouter();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState('');
  const settling = payable.installments.find((item) => item.id === settlingId);

  const cancel = async () => {
    const result = await cancelPayableAction(payable.id, cancelReason);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{payable.description}</h1>
            <p className="text-gray-600">{payable.vendor.name}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{payableStatusLabels[payable.status]}</Badge>
              {payable.category && <Badge variant="secondary">{payable.category.name}</Badge>}
              {payable.property && <Badge variant="secondary">{payable.property.code}</Badge>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Saldo</div>
            <div className="text-2xl font-bold">
              {formatCurrency(payable.totalBalanceAmount)}
            </div>
            <div className="text-sm text-gray-500">
              de {formatCurrency(payable.totalAmount)}
            </div>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div>
            <dt className="text-gray-500">Documento</dt>
            <dd>{payable.documentNumber || '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Emissão</dt>
            <dd>
              {payable.issueDate
                ? formatDateStringBR(isoDate(new Date(payable.issueDate)))
                : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Competência</dt>
            <dd>
              {payable.competenceDate
                ? formatDateStringBR(isoDate(new Date(payable.competenceDate)))
                : '-'}
            </dd>
          </div>
        </dl>
        {payable.notes && <p className="mt-4 text-sm text-gray-700">{payable.notes}</p>}
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Parcelas</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-gray-600">
              <tr>
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Vencimento</th>
                <th className="py-2 pr-3">Método</th>
                <th className="py-2 pr-3 text-right">Valor</th>
                <th className="py-2 pr-3 text-right">Saldo</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {payable.installments.map((installment) => (
                <tr key={installment.id} className="border-b last:border-0 align-top">
                  <td className="py-2 pr-3">{installment.installmentNumber}</td>
                  <td className="py-2 pr-3">
                    {formatDateStringBR(isoDate(new Date(installment.dueDate)))}
                    {installment.boletoLine && (
                      <div className="text-xs text-gray-500">{installment.boletoLine}</div>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {paymentMethodLabels[installment.paymentMethod]}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {formatCurrency(installment.amount)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {formatCurrency(installment.remainingAmount)}
                  </td>
                  <td className="py-2 pr-3">
                    {installment.isOverdue ? (
                      <Badge variant="destructive">Atrasada</Badge>
                    ) : (
                      <Badge variant="outline">
                        {installmentStatusLabels[installment.status]}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {(installment.status === 'OPEN' ||
                      installment.status === 'PARTIALLY_PAID') && (
                      <Button size="sm" onClick={() => setSettlingId(installment.id)}>
                        Baixar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payable.installments.flatMap((installment) =>
          installment.settlements.map((settlement) => (
            <div
              key={settlement.id}
              className="mt-3 flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <div>
                Baixa de {formatCurrency(settlement.amount)} em{' '}
                {formatDateStringBR(isoDate(new Date(settlement.paidAt)))} via{' '}
                {settlement.bankAccount.name}
                {settlement.transaction
                  ? ` · ${settlement.transaction.description}`
                  : ' · sem transação'}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const result = await reverseSettlementAction(settlement.id);
                  if (!result.success) setError(result.error);
                  else router.refresh();
                }}
              >
                Estornar
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Anexos</h2>
        <form
          action={async (formData) => {
            formData.set('payableId', payable.id);
            const result = await uploadPayableAttachmentAction(formData);
            if (!result.success) setError(result.error);
            else router.refresh();
          }}
          className="mb-4 flex gap-2"
        >
          <Input type="file" name="file" required />
          <Button type="submit">Enviar</Button>
        </form>
        <ul className="space-y-2 text-sm">
          {payable.attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between">
              <a
                href={attachment.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline"
              >
                {attachment.fileName}
              </a>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await deletePayableAttachmentAction(attachment.id, payable.id);
                  router.refresh();
                }}
              >
                Remover
              </Button>
            </li>
          ))}
          {payable.attachments.length === 0 && (
            <li className="text-gray-500">Nenhum anexo.</li>
          )}
        </ul>
      </div>

      {payable.status !== 'CANCELED' && payable.totalPaidAmount === 0 && (
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold">Cancelar título</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Motivo"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <Button variant="outline" onClick={cancel}>
              Cancelar título
            </Button>
          </div>
        </div>
      )}

      <Link href="/contas-a-pagar" className="text-sm text-blue-700 hover:underline">
        ← Voltar para a lista
      </Link>

      {settling && (
        <SettlementDialog
          installment={{
            id: settling.id,
            payableId: payable.id,
            installmentNumber: settling.installmentNumber,
            dueDate: settling.dueDate,
            amount: settling.amount,
            paidAmount: settling.paidAmount,
            remainingAmount: settling.remainingAmount,
            paymentMethod: settling.paymentMethod,
            boletoLine: settling.boletoLine,
            status: settling.status,
            isOverdue: settling.isOverdue,
            isDueToday: settling.isDueToday,
            payable: {
              id: payable.id,
              description: payable.description,
              status: payable.status,
              vendor: { id: payable.vendor.id, name: payable.vendor.name },
              category: payable.category,
              property: payable.property,
            },
          }}
          onClose={() => setSettlingId(null)}
        />
      )}
    </div>
  );
}
