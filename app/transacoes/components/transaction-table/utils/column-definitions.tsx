import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import SuggestionIndicator from '../../SuggestionIndicator';
import { getTypeColor, getTypeLabel } from './transaction-helpers';
import type { Transaction } from '../types';
import type { Row } from '@tanstack/react-table';

const columnHelper = createColumnHelper<Transaction>();

interface ColumnDefinitionProps {
  categoryOptions: ComboboxOption[];
  propertyOptions: ComboboxOption[];
  editingId: string | null;
  editingCategory: string;
  editingProperty: string;
  isPending: boolean;
  setEditingCategory: (value: string) => void;
  setEditingProperty: (value: string) => void;
  startEdit: (transaction: Transaction) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;
  handleMarkReviewed: (id: string, reviewed: boolean) => Promise<void>;
  onSelectClick?: (e: React.MouseEvent<any>, row: Row<Transaction>, fromCheckbox?: boolean) => void;
}

export function createColumnDefinitions({
  categoryOptions,
  propertyOptions,
  editingId,
  editingCategory,
  editingProperty,
  isPending,
  setEditingCategory,
  setEditingProperty,
  startEdit,
  saveEdit,
  cancelEdit,
  handleMarkReviewed,
  onSelectClick,
}: ColumnDefinitionProps): ColumnDef<Transaction>[] {
  return [
    // Selection column
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <Input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="rounded border-gray-300 w-4 h-4"
        />
      ),
      cell: ({ row }) => (
        <Input
          type="checkbox"
          checked={row.getIsSelected()}
          onClick={(e) => onSelectClick?.(e, row, true)}
          onChange={() => {}}
          className="rounded border-gray-300 w-4 h-4"
        />
      ),
      enableSorting: false,
      size: 40,
    }),

    // Suggestion indicator column
    columnHelper.display({
      id: 'suggestions',
      header: 'Sugestão',
      cell: ({ row }) => <SuggestionIndicator transaction={row.original} />,
      enableSorting: false,
      size: 60,
    }),

    // Date column
    columnHelper.accessor('transaction.date', {
      id: 'date',
      header: 'Data',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 leading-tight">
          {formatDate(getValue())}
        </div>
      ),
      sortingFn: 'datetime',
      size: 100,
    }),

    // Description column
    columnHelper.accessor('transaction.description', {
      id: 'description',
      header: 'Descrição',
      cell: ({ getValue, row }) => (
        <div className="text-[11px] text-gray-900 leading-tight py-1">
          <div className="break-words">
            {getValue()}
          </div>
          {row.original.details && (
            <div className="text-[10px] text-gray-500 mt-0.5 break-words">
              {row.original.details}
            </div>
          )}
        </div>
      ),
      size: 200,
    }),

    // Bank account column
    columnHelper.accessor('transaction.bankAccount.name', {
      id: 'account',
      header: 'Conta',
      cell: ({ getValue, row }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 leading-tight">
          <div>{getValue()}</div>
          <div className="text-[11px] text-gray-500">
            {row.original.transaction.bankAccount.bankName}
          </div>
        </div>
      ),
      size: 120,
    }),

    // Type column
    columnHelper.accessor('category.type', {
      id: 'type',
      header: 'Tipo',
      cell: ({ getValue }) => (
        <span
          className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getTypeColor(
            getValue()
          )}`}
        >
          {getTypeLabel(getValue())}
        </span>
      ),
      size: 80,
    }),

    // Category column
    columnHelper.accessor('category', {
      id: 'category',
      header: 'Categoria',
      cell: ({ getValue, row }) => {
        const category = getValue();
        
        if (editingId === row.id) {
          return (
            <Combobox
              options={categoryOptions}
              value={editingCategory}
              onValueChange={setEditingCategory}
              placeholder="Selecionar categoria"
              searchPlaceholder="Buscar categoria..."
              emptyMessage="Nenhuma categoria encontrada."
              allowClear={false}
              compact={true}
              className="w-full"
            />
          );
        }

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {category.parent && (
              <div className="text-[9px] text-gray-400 leading-tight mb-0.5">
                {category.parent.name}
              </div>
            )}
            <div className="text-xs text-gray-900">
              {category.name}
            </div>
          </div>
        );
      },
      size: 180,
    }),

    // Property column
    columnHelper.accessor('property', {
      id: 'property',
      header: 'Propriedade',
      cell: ({ getValue, row }) => {
        const property = getValue();
        
        if (editingId === row.id) {
          return (
            <Combobox
              options={propertyOptions}
              value={editingProperty}
              onValueChange={setEditingProperty}
              placeholder="Selecionar propriedade"
              searchPlaceholder="Buscar propriedade..."
              emptyMessage="Nenhuma propriedade encontrada."
              clearLabel="Nenhuma"
              compact={true}
              className="w-full"
            />
          );
        }

        const isRentalTransaction = 
          row.original.category.name === 'Aluguel' || 
          row.original.category.name === 'Aluguel de Terceiros' ||
          row.original.category.name === 'Repasse de Aluguel' ||
          row.original.category.name === 'Aluguel Pago';
        
        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {property ? (
              <div>
                <div className="font-medium">
                  {property.code}
                </div>
                <div className="text-[11px] text-gray-500">
                  {property.city}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {isRentalTransaction && (
                  <span className="text-yellow-600 text-xs" title="Aluguel sem imóvel associado">
                    ⚠️
                  </span>
                )}
                <span className={isRentalTransaction ? "text-red-500 font-medium" : "text-gray-400"}>
                  {isRentalTransaction ? "Faltando" : "-"}
                </span>
              </div>
            )}
          </div>
        );
      },
      size: 120,
    }),

    // Amount column
    columnHelper.accessor('transaction.amount', {
      id: 'amount',
      header: 'Valor',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-right leading-tight">
          <div
            className={`font-medium ${
              getValue() >= 0
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {formatCurrency(getValue())}
          </div>
        </div>
      ),
      size: 120,
    }),

    // Status column
    columnHelper.accessor('isReviewed', {
      id: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <div className="flex flex-col items-center space-y-0.5">
          {getValue() ? (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
              Revisado
            </span>
          ) : (
            <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
              Pendente
            </span>
          )}
        </div>
      ),
      size: 100,
    }),

    // Actions column
    columnHelper.display({
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          {editingId === row.id ? (
            <>
              <Button
                onClick={saveEdit}
                disabled={isPending}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800"
              >
                Salvar
              </Button>
              <Button
                onClick={cancelEdit}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => startEdit(row.original)}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-800"
              >
                Editar
              </Button>
              {!row.original.isReviewed && (
                <Button
                  onClick={() =>
                    handleMarkReviewed(row.original.id, true)
                  }
                  disabled={isPending}
                  variant="ghost"
                  size="sm"
                  className="text-green-600 hover:text-green-800"
                >
                  ✓
                </Button>
              )}
            </>
          )}
        </div>
      ),
      enableSorting: false,
      size: 120,
    }),
  ];
}
