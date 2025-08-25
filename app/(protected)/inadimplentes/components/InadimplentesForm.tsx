'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createItem } from '../actions';
import { useRouter } from 'next/navigation';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';

interface PropertyOption {
  id: string;
  code: string;
  address: string;
  city: string;
}

export default function InadimplentesForm({
  properties,
}: {
  properties: PropertyOption[];
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [tenant, setTenant] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [settled, setSettled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!propertyId || !tenant || !amount || !dueDate) return;
    setSubmitting(true);
    try {
      await createItem({
        propertyId,
        tenant,
        amount: parseFloat(amount.replace(',', '.')),
        dueDate,
        settled,
      });
      setTenant('');
      setAmount('');
      setDueDate('');
      setSettled(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <Label>Imóvel</Label>
          <Combobox
            className="w-full"
            options={properties.map<ComboboxOption>((p) => ({
              value: p.id,
              label: p.code,
              keywords: [p.address, p.city].filter(Boolean) as string[],
            }))}
            value={propertyId}
            onValueChange={(val) => setPropertyId(val)}
            placeholder="Selecionar imóvel"
            searchPlaceholder="Buscar por código, endereço ou cidade..."
            emptyMessage="Nenhum imóvel encontrado."
            allowClear={false}
          />
        </div>
        <div>
          <Label>Inquilino</Label>
          <Input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="Nome do inquilino"
            required
          />
        </div>
        <div>
          <Label>Valor (R$)</Label>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            required
          />
        </div>
        <div>
          <Label>Vencimento</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={settled}
              onChange={(e) => setSettled(e.target.checked)}
            />
            Quitado
          </label>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}
