'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { createPayableAction, createVendorAction } from '../actions';
import { isoDate } from '@/lib/core/payables/dates';
import { paymentMethodLabels } from '@/lib/core/payables/labels';
import type { PayablePaymentMethod } from '@/app/generated/prisma';

type Option = { id: string; name?: string; code?: string; defaultCategoryId?: string | null; defaultPropertyId?: string | null };

type InstallmentDraft = {
  dueDate: string;
  amount: string;
  paymentMethod: PayablePaymentMethod;
  boletoLine: string;
};

export function PayableForm({
  vendors,
  categories,
  properties,
}: {
  vendors: Option[];
  categories: { id: string; name: string }[];
  properties: { id: string; code: string }[];
}) {
  const router = useRouter();
  const today = isoDate(new Date());
  const [vendorId, setVendorId] = useState('');
  const [newVendorName, setNewVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [competenceDate, setCompetenceDate] = useState(today.slice(0, 7) + '-01');
  const [categoryId, setCategoryId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [notes, setNotes] = useState('');
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { dueDate: today, amount: '', paymentMethod: 'BOLETO', boletoLine: '' },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => ({ value: vendor.id, label: vendor.name ?? vendor.id })),
    [vendors]
  );

  const onVendorChange = (id: string) => {
    setVendorId(id);
    const vendor = vendors.find((item) => item.id === id);
    if (vendor?.defaultCategoryId) setCategoryId(vendor.defaultCategoryId);
    if (vendor?.defaultPropertyId) setPropertyId(vendor.defaultPropertyId);
  };

  const addInstallment = () => {
    setInstallments((current) => [
      ...current,
      {
        dueDate: current[current.length - 1]?.dueDate || today,
        amount: '',
        paymentMethod: current[0]?.paymentMethod ?? 'BOLETO',
        boletoLine: '',
      },
    ]);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    let resolvedVendorId = vendorId;
    if (!resolvedVendorId && newVendorName.trim()) {
      const created = await createVendorAction({ name: newVendorName.trim() });
      if (!created.success) {
        setLoading(false);
        setError(created.error);
        return;
      }
      resolvedVendorId = created.vendor.id;
    }

    const result = await createPayableAction({
      vendorId: resolvedVendorId,
      description,
      documentNumber,
      issueDate,
      competenceDate,
      categoryId: categoryId || null,
      propertyId: propertyId || null,
      notes,
      installments: installments.map((item) => ({
        dueDate: item.dueDate,
        amount: Number(item.amount.replace(',', '.')),
        paymentMethod: item.paymentMethod,
        boletoLine: item.boletoLine || null,
      })),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/contas-a-pagar/${result.id}`);
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-lg border bg-white p-6">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Combobox
          options={vendorOptions}
          value={vendorId}
          onValueChange={onVendorChange}
          placeholder="Fornecedor"
        />
        <Input
          placeholder="Ou criar fornecedor pelo nome"
          value={newVendorName}
          onChange={(e) => setNewVendorName(e.target.value)}
        />
        <Input
          required
          placeholder="Descrição *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          placeholder="Número do documento"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-sm text-gray-600">Emissão</label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-600">Competência</label>
          <Input
            type="date"
            value={competenceDate}
            onChange={(e) => setCompetenceDate(e.target.value)}
          />
        </div>
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
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Parcelas</h2>
          <Button type="button" variant="outline" onClick={addInstallment}>
            Adicionar parcela
          </Button>
        </div>
        {installments.map((item, index) => (
          <div key={index} className="grid gap-3 rounded border p-3 md:grid-cols-4">
            <Input
              type="date"
              required
              value={item.dueDate}
              onChange={(e) => {
                const next = [...installments];
                next[index] = { ...item, dueDate: e.target.value };
                setInstallments(next);
              }}
            />
            <Input
              required
              placeholder="Valor"
              value={item.amount}
              onChange={(e) => {
                const next = [...installments];
                next[index] = { ...item, amount: e.target.value };
                setInstallments(next);
              }}
            />
            <Combobox
              options={Object.entries(paymentMethodLabels).map(([value, label]) => ({
                value,
                label,
              }))}
              value={item.paymentMethod}
              onValueChange={(value) => {
                const next = [...installments];
                next[index] = {
                  ...item,
                  paymentMethod: value as PayablePaymentMethod,
                };
                setInstallments(next);
              }}
              allowClear={false}
            />
            <Input
              placeholder="Linha digitável"
              value={item.boletoLine}
              onChange={(e) => {
                const next = [...installments];
                next[index] = { ...item, boletoLine: e.target.value };
                setInstallments(next);
              }}
            />
          </div>
        ))}
      </div>

      <Textarea
        placeholder="Observações"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Criar título'}
      </Button>
    </form>
  );
}
