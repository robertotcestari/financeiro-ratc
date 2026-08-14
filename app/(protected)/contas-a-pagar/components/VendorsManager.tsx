'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  createVendorAction,
  deactivateVendorAction,
  updateVendorAction,
} from '../actions';
import type { VendorInput } from '@/lib/core/database/vendors';

type VendorRow = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  defaultCategoryId: string | null;
  defaultPropertyId: string | null;
};

export function VendorsManager({
  vendors,
  categoryOptions,
  propertyOptions,
}: {
  vendors: VendorRow[];
  categoryOptions: ComboboxOption[];
  propertyOptions: ComboboxOption[];
}) {
  const router = useRouter();
  const emptyForm: VendorInput = {
    name: '',
    document: '',
    email: '',
    phone: '',
    notes: '',
    isActive: true,
    defaultCategoryId: '',
    defaultPropertyId: '',
  };
  const [form, setForm] = useState<VendorInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vendors;
    return vendors.filter(
      (vendor) =>
        vendor.name.toLowerCase().includes(term) ||
        (vendor.document ?? '').toLowerCase().includes(term)
    );
  }, [search, vendors]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    const payload: VendorInput = {
      ...form,
      defaultCategoryId: form.defaultCategoryId || null,
      defaultPropertyId: form.defaultPropertyId || null,
    };
    const result = editingId
      ? await updateVendorAction(editingId, payload)
      : await createVendorAction(payload);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setForm(emptyForm);
    setEditingId(null);
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">
          {editingId ? 'Editar fornecedor' : 'Novo fornecedor'}
        </h2>
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <Input
          required
          placeholder="Nome *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          placeholder="CNPJ / CPF"
          value={form.document ?? ''}
          onChange={(e) => setForm({ ...form, document: e.target.value })}
        />
        <Input
          placeholder="E-mail"
          value={form.email ?? ''}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          placeholder="Telefone"
          value={form.phone ?? ''}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <Combobox
          options={categoryOptions}
          value={form.defaultCategoryId ?? ''}
          onValueChange={(value) =>
            setForm({ ...form, defaultCategoryId: value })
          }
          placeholder="Categoria padrão"
          allowClear
          clearLabel="Nenhuma"
        />
        <Combobox
          options={propertyOptions}
          value={form.defaultPropertyId ?? ''}
          onValueChange={(value) =>
            setForm({ ...form, defaultPropertyId: value })
          }
          placeholder="Imóvel padrão"
          allowClear
          clearLabel="Nenhum"
        />
        <Textarea
          placeholder="Observações"
          value={form.notes ?? ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="rounded-lg border bg-white p-4">
        <div className="mb-4">
          <Input
            placeholder="Buscar fornecedor"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-gray-600">
              <tr>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">Documento</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((vendor) => (
                <tr key={vendor.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 font-medium">{vendor.name}</td>
                  <td className="py-2 pr-3">{vendor.document || '-'}</td>
                  <td className="py-2 pr-3">
                    {vendor.isActive ? 'Ativo' : 'Inativo'}
                  </td>
                  <td className="py-2 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(vendor.id);
                        setForm({
                          name: vendor.name,
                          document: vendor.document ?? '',
                          email: vendor.email ?? '',
                          phone: vendor.phone ?? '',
                          notes: vendor.notes ?? '',
                          isActive: vendor.isActive,
                          defaultCategoryId: vendor.defaultCategoryId ?? '',
                          defaultPropertyId: vendor.defaultPropertyId ?? '',
                        });
                      }}
                    >
                      Editar
                    </Button>
                    {vendor.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await deactivateVendorAction(vendor.id);
                          router.refresh();
                        }}
                      >
                        Desativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              Nenhum fornecedor cadastrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
