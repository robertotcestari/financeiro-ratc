'use client';

import { setSettled } from '../actions';
import { useTransition } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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

interface PropertyMap { [id: string]: { code: string } }

export default function InadimplentesTable({ items, properties }: { items: Item[]; properties: PropertyMap }) {
  const [pending, startTransition] = useTransition();

  const toggle = (id: string, value: boolean) => {
    startTransition(async () => {
      await setSettled(id, value);
      // optimistic handled by refresh from parent
    });
  };

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imóvel</TableHead>
            <TableHead>Inquilino</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead className="text-right">Quitado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{properties[item.data.propertyId]?.code || '-'}</TableCell>
              <TableCell>{item.data.tenant}</TableCell>
              <TableCell>{fmt(item.data.amount)}</TableCell>
              <TableCell>{new Date(item.data.dueDate).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell className="text-right">
                <Button variant={item.data.settled ? 'default' : 'outline'} size="sm" onClick={() => toggle(item.id, !item.data.settled)} disabled={pending}>
                  {item.data.settled ? 'Sim' : 'Não'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
