'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import {
  createRecurrenceAction,
  generateRecurrenceAction,
  setRecurrenceActiveAction,
} from '../actions';
import { isoDate } from '@/lib/core/payables/dates';
import {
  paymentMethodLabels,
  recurrenceFrequencyLabels,
} from '@/lib/core/payables/labels';
import { formatCurrency } from '@/lib/formatters';
import type {
  PayablePaymentMethod,
  PayableRecurrenceFrequency,
} from '@/app/generated/prisma/browser';

type RecurrenceRow = {
  id: string;
  vendorId: string;
  description: string;
  categoryId: string | null;
  propertyId: string | null;
  amount: number;
  paymentMethod: PayablePaymentMethod;
  frequency: PayableRecurrenceFrequency;
  dayOfMonth: number;
  startDate: Date;
  endDate: Date | null;
  isActive: boolean;
  vendor: { id: string; name: string };
  category: { id: string; name: string } | null;
  property: { id: string; code: string } | null;
};

export function RecurrencesManager({
  recurrences,
  vendors,
  categories,
  properties,
}: {
  recurrences: RecurrenceRow[];
  vendors: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  properties: { id: string; code: string }[];
}) {
  const router = useRouter();
  const today = isoDate(new Date());
  const [vendorId, setVendorId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('10');
  const [frequency, setFrequency] =
    useState<PayableRecurrenceFrequency>('MONTHLY');
  const [paymentMethod, setPaymentMethod] =
    useState<PayablePaymentMethod>('BOLETO');
  const [categoryId, setCategoryId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [error, setError] = useState('');
  const now = new Date();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await createRecurrenceAction({
      vendorId,
      description,
      amount: Number(amount.replace(',', '.')),
      dayOfMonth: Number(dayOfMonth),
      frequency,
      paymentMethod,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      startDate,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDescription('');
    setAmount('');
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Nova recorrência</h2>
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Combobox
          options={vendors.map((vendor) => ({
            value: vendor.id,
            label: vendor.name,
          }))}
          value={vendorId}
          onValueChange={setVendorId}
          placeholder="Fornecedor"
          allowClear={false}
        />
        <Input
          required
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          required
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <Input
          type="number"
          min={1}
          max={31}
          value={dayOfMonth}
          onChange={(e) => setDayOfMonth(e.target.value)}
        />
        <Combobox
          options={Object.entries(recurrenceFrequencyLabels).map(
            ([value, label]) => ({ value, label })
          )}
          value={frequency}
          onValueChange={(value) =>
            setFrequency(value as PayableRecurrenceFrequency)
          }
          allowClear={false}
        />
        <Combobox
          options={Object.entries(paymentMethodLabels).map(([value, label]) => ({
            value,
            label,
          }))}
          value={paymentMethod}
          onValueChange={(value) =>
            setPaymentMethod(value as PayablePaymentMethod)
          }
          allowClear={false}
        />
        <Combobox
          options={categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          value={categoryId}
          onValueChange={setCategoryId}
          placeholder="Categoria"
        />
        <Combobox
          options={properties.map((property) => ({
            value: property.id,
            label: property.code,
          }))}
          value={propertyId}
          onValueChange={setPropertyId}
          placeholder="Imóvel"
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Button type="submit">Criar</Button>
      </form>

      <div className="rounded-lg border bg-white p-4">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-gray-600">
            <tr>
              <th className="py-2 pr-3">Descrição</th>
              <th className="py-2 pr-3">Fornecedor</th>
              <th className="py-2 pr-3">Valor</th>
              <th className="py-2 pr-3">Dia</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {recurrences.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  {item.description}
                  <div className="text-xs text-gray-500">
                    {recurrenceFrequencyLabels[item.frequency]}
                    {!item.isActive ? ' · inativa' : ''}
                  </div>
                </td>
                <td className="py-2 pr-3">{item.vendor.name}</td>
                <td className="py-2 pr-3">{formatCurrency(item.amount)}</td>
                <td className="py-2 pr-3">{item.dayOfMonth}</td>
                <td className="py-2 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await generateRecurrenceAction(
                        item.id,
                        now.getFullYear(),
                        now.getMonth() + 1
                      );
                      router.refresh();
                    }}
                  >
                    Gerar mês
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await setRecurrenceActiveAction(item.id, !item.isActive);
                      router.refresh();
                    }}
                  >
                    {item.isActive ? 'Pausar' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {recurrences.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            Nenhuma recorrência cadastrada.
          </p>
        )}
      </div>
    </div>
  );
}
