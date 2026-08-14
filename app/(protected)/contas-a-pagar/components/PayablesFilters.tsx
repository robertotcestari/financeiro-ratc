'use client';

import { useRouter } from 'next/navigation';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export type PayablesFiltersState = {
  status: string;
  vendorId: string;
  propertyId: string;
  categoryId: string;
  dueFrom: string;
  dueTo: string;
  overdue: string;
  busca: string;
  showCanceled: string;
};

export function PayablesFilters({
  filters,
  vendors,
  properties,
  categories,
}: {
  filters: PayablesFiltersState;
  vendors: ComboboxOption[];
  properties: ComboboxOption[];
  categories: ComboboxOption[];
}) {
  const router = useRouter();

  const push = (next: PayablesFiltersState) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    router.push(`/contas-a-pagar${query ? `?${query}` : ''}`);
  };

  const update = (key: keyof PayablesFiltersState, value: string) => {
    push({ ...filters, [key]: value });
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-4">
      <Combobox
        options={[
          { value: 'OPEN', label: 'Em aberto' },
          { value: 'PARTIALLY_PAID', label: 'Parcialmente pago' },
          { value: 'PAID', label: 'Pago' },
          { value: 'CANCELED', label: 'Cancelado' },
        ]}
        value={filters.status}
        onValueChange={(value) => update('status', value)}
        placeholder="Status"
        clearLabel="Todos"
      />
      <Combobox
        options={vendors}
        value={filters.vendorId}
        onValueChange={(value) => update('vendorId', value)}
        placeholder="Fornecedor"
        clearLabel="Todos"
      />
      <Combobox
        options={properties}
        value={filters.propertyId}
        onValueChange={(value) => update('propertyId', value)}
        placeholder="Imóvel"
        clearLabel="Todos"
      />
      <Combobox
        options={categories}
        value={filters.categoryId}
        onValueChange={(value) => update('categoryId', value)}
        placeholder="Categoria"
        clearLabel="Todas"
      />
      <Input
        type="date"
        value={filters.dueFrom}
        onChange={(e) => update('dueFrom', e.target.value)}
      />
      <Input
        type="date"
        value={filters.dueTo}
        onChange={(e) => update('dueTo', e.target.value)}
      />
      <Combobox
        options={[
          { value: 'true', label: 'Somente atrasadas' },
          { value: 'false', label: 'Sem atraso' },
        ]}
        value={filters.overdue}
        onValueChange={(value) => update('overdue', value)}
        placeholder="Atraso"
        clearLabel="Todas"
      />
      <div className="flex gap-2">
        <Input
          placeholder="Buscar"
          defaultValue={filters.busca}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              update('busca', (e.target as HTMLInputElement).value);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            push({
              status: '',
              vendorId: '',
              propertyId: '',
              categoryId: '',
              dueFrom: '',
              dueTo: '',
              overdue: '',
              busca: '',
              showCanceled: '',
            })
          }
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
