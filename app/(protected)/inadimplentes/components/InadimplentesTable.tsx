'use client';

import React from 'react';
import { setSettled, deleteItem } from '../actions';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { formatDateStringBR } from '@/lib/utils/date-helpers';

interface Item {
  id: string;
  data: {
    propertyId: string;
    tenant: string;
    amount: number;
    dueDate: string;
    settled: boolean;
  };
}

interface PropertyMap {
  [id: string]: { code: string };
}

export default function InadimplentesTable({
  items,
  properties,
}: {
  items: Item[];
  properties: PropertyMap;
}) {
  const [pending, startTransition] = useTransition();
  const [showSettled, setShowSettled] = React.useState(false);

  const toggle = (id: string, value: boolean) => {
    startTransition(async () => {
      await setSettled(id, value);
      // optimistic handled by refresh from parent
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este inadimplente?')) {
      startTransition(async () => {
        await deleteItem(id);
        // optimistic handled by refresh from parent
      });
    }
  };

  const fmt = (n: number) => {
    if (isNaN(n) || n === null || n === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(n);
  };

  const formatDate = (dateString: string) => formatDateStringBR(dateString);
  const visibleItems = showSettled
    ? items
    : items.filter((item) => item?.data && !item.data.settled);

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Nenhum inadimplente cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Label htmlFor="show-settled">
          <Switch
            id="show-settled"
            checked={showSettled}
            onCheckedChange={setShowSettled}
          />
          Mostrar quitados
        </Label>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          <p>Nenhum inadimplente em aberto para exibir.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600 border-b">
              <tr>
                <th className="py-2 pr-4">Imóvel</th>
                <th className="py-2 pr-4">Inquilino</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Vencimento</th>
                <th className="py-2 pr-4 text-right">Status</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item, index) => {
                // Defensive: skip if item or item.data is null/undefined
                if (!item || !item.data) {
                  return (
                    <tr
                      key={item?.id ?? index}
                      className="border-b last:border-none"
                    >
                      <td className="py-2 pr-4">-</td>
                      <td className="py-2 pr-4">-</td>
                      <td className="py-2 pr-4">-</td>
                      <td className="py-2 pr-4">-</td>
                      <td className="py-2 pr-4 text-right">-</td>
                      <td className="py-2 text-right">-</td>
                    </tr>
                  );
                }
                const propertyCode = item.data.propertyId
                  ? properties[item.data.propertyId]?.code || '-'
                  : '-';
                return (
                  <tr key={item.id} className="border-b last:border-none">
                    <td className="py-2 pr-4">{propertyCode}</td>
                    <td className="py-2 pr-4">{item.data.tenant || '-'}</td>
                    <td className="py-2 pr-4">{fmt(item.data.amount)}</td>
                    <td className="py-2 pr-4">{formatDate(item.data.dueDate)}</td>
                    <td className="py-2 pr-4 text-right">
                      {item.data.settled ? (
                        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Quitado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Em aberto</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggle(item.id, !item.data.settled)}
                          disabled={pending}
                        >
                          {item.data.settled ? 'Reabrir' : 'Quitar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={pending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
