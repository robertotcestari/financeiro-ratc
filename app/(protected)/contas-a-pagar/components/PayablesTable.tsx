'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { formatDateStringBR } from '@/lib/utils/date-helpers';
import { isoDate } from '@/lib/core/payables/dates';
import {
  installmentStatusLabels,
  paymentMethodLabels,
} from '@/lib/core/payables/labels';
import type { InstallmentListItem } from '@/lib/core/database/payables';
import { SettlementDialog } from './SettlementDialog';

export function PayablesTable({
  items,
}: {
  items: InstallmentListItem[];
}) {
  const [settling, setSettling] = useState<InstallmentListItem | null>(null);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-white py-12 text-center text-sm text-gray-500">
        Nenhuma parcela encontrada. Cancele os filtros ou cadastre um título.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Vencimento</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Imóvel</th>
              <th className="px-3 py-2 text-right">Valor</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatDateStringBR(isoDate(new Date(item.dueDate)))}
                </td>
                <td className="px-3 py-2">{item.payable.vendor.name}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/contas-a-pagar/${item.payableId}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {item.payable.description}
                  </Link>
                  <div className="text-xs text-gray-500">
                    Parcela {item.installmentNumber} ·{' '}
                    {paymentMethodLabels[item.paymentMethod]}
                  </div>
                </td>
                <td className="px-3 py-2">
                  {item.payable.property?.code ?? '-'}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(item.amount)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(item.remainingAmount)}
                </td>
                <td className="px-3 py-2">
                  {item.isOverdue ? (
                    <Badge variant="destructive">Atrasada</Badge>
                  ) : item.isDueToday ? (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Vence hoje
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {installmentStatusLabels[item.status]}
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {(item.status === 'OPEN' || item.status === 'PARTIALLY_PAID') && (
                    <Button size="sm" onClick={() => setSettling(item)}>
                      Baixar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {settling && (
        <SettlementDialog
          installment={settling}
          onClose={() => setSettling(null)}
        />
      )}
    </>
  );
}
