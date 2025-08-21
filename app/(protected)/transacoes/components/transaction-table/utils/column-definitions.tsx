import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Pencil, Check } from 'lucide-react';
import SuggestionIndicator from '../../SuggestionIndicator';
import { getTypeColor, getTypeLabel, getTypeFullLabel } from './transaction-helpers';
import { AlertTriangle } from 'lucide-react';
import type { Transaction } from '../types';
import type { Row } from '@tanstack/react-table';

const columnHelper = createColumnHelper<Transaction>();

interface ColumnDefinitionProps {
  categoryOptions: ComboboxOption[];
  propertyOptions: ComboboxOption[];
  editingId: string | null;
  editingCategory: string;
  editingProperty: string;
  editingDescription: string;
  isPending: boolean;
  setEditingCategory: (value: string) => void;
  setEditingProperty: (value: string) => void;
  setEditingDescription: (value: string) => void;
  startEdit: (transaction: Transaction) => void;
  saveEdit: () => Promise<void>;
  cancelEdit: () => void;
  handleMarkReviewed: (id: string, reviewed: boolean) => Promise<void>;
  onSelectClick?: (
    e: React.MouseEvent<HTMLElement>,
    row: Row<Transaction>,
    fromCheckbox?: boolean
  ) => void;
}

export function createColumnDefinitions({
  categoryOptions,
  propertyOptions,
  editingId,
  editingCategory,
  editingProperty,
  editingDescription,
  isPending,
  setEditingCategory,
  setEditingProperty,
  setEditingDescription,
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
      size: 32,
    }),

    // Suggestion indicator column
    columnHelper.display({
      id: 'suggestions',
      header: 'Sugestão',
      cell: ({ row }) => <SuggestionIndicator transaction={row.original} />,
      enableSorting: false,
      size: 50,
    }),

    // Date column
    columnHelper.accessor('transaction.date', {
      id: 'date',
      header: 'Data',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-gray-900 leading-tight">
          {formatDate(getValue() as Date)}
        </div>
      ),
      sortingFn: 'datetime',
      size: 85,
    }) as ColumnDef<Transaction>,

    // Description column (raw bank description)
    columnHelper.accessor('transaction.description', {
      id: 'description',
      header: 'Descrição',
      cell: ({ getValue }) => {
        const rawDescription = getValue();
        return (
          <div className="text-[11px] text-gray-900 leading-tight py-1 break-words">
            {rawDescription}
          </div>
        );
      },
      size: 250,
    }) as ColumnDef<Transaction>,

    // Details column (editable user-provided details)
    columnHelper.accessor('details', {
      id: 'details',
      header: 'Detalhes',
      cell: ({ getValue, row }) => {
        const details = getValue();

        if (editingId === row.id) {
          return (
            <div className="py-1">
              <Textarea
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    try {
                      saveEdit();
                    } catch {}
                  }
                }}
                onBlur={() => {
                  try {
                    saveEdit();
                  } catch {}
                }}
                placeholder={row.original.transaction.description || 'Detalhes'}
                className="w-full text-[11px] leading-tight resize-none h-7 min-h-[28px] py-1"
                rows={1}
              />
            </div>
          );
        }

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="text-[11px] text-gray-900 leading-tight py-1 break-words cursor-pointer"
            title={details || ''}
          >
            {details && details.trim().length > 0 ? (
              details
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>
        );
      },
      size: 220,
    }) as ColumnDef<Transaction>,

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
      size: 110,
    }) as ColumnDef<Transaction>,

    // Type column
    columnHelper.accessor('category.type', {
      id: 'type',
      header: 'Tipo',
      cell: ({ getValue, row }) => {
        const type = getValue();
        const isUncategorized =
          type === 'UNCATEGORIZED' ||
          row.original.category?.id === 'uncategorized';
        if (isUncategorized) {
          return (
            <span className="inline-flex items-center justify-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800" title="Sem Categoria">
              <AlertTriangle className="h-2.5 w-2.5" />
            </span>
          );
        }
        return (
          <span
            className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getTypeColor(
              type
            )}`}
            title={getTypeFullLabel(type)}
          >
            {getTypeLabel(type)}
          </span>
        );
      },
      size: 90,
    }) as ColumnDef<Transaction>,

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
              allowClear={true}
              compact={true}
              className="w-full"
            />
          );
        }
        const isUncategorized =
          category?.type === 'UNCATEGORIZED' ||
          category?.id === 'uncategorized';

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {category.parent && !isUncategorized && (
              <div className="text-[9px] text-gray-400 leading-tight mb-0.5">
                {category.parent.name}
              </div>
            )}
            {isUncategorized ? (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                <AlertTriangle className="h-2.5 w-2.5" />
                Sem Categoria
              </span>
            ) : (
              <div className="text-xs text-gray-900">{category.name}</div>
            )}
          </div>
        );
      },
      size: 160,
    }) as ColumnDef<Transaction>,

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

        // Categories that require a property associated
        const requiresProperty =
          row.original.category.name === 'Aluguel' ||
          row.original.category.name === 'Aluguel de Terceiros' ||
          row.original.category.name === 'Repasse de Aluguel' ||
          row.original.category.name === 'Aluguel Pago' ||
          row.original.category.name === 'Manutenção';

        return (
          <div
            onDoubleClick={() => startEdit(row.original)}
            className="cursor-pointer"
          >
            {property ? (
              <div>
                <div className="font-medium">{property.code}</div>
                <div className="text-[11px] text-gray-500">{property.city}</div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {requiresProperty && (
                  <span
                    className="text-yellow-600 text-xs"
                    title="Categoria exige imóvel associado"
                  >
                    ⚠️
                  </span>
                )}
                <span
                  className={
                    requiresProperty
                      ? 'text-red-500 font-medium'
                      : 'text-gray-400'
                  }
                >
                  {requiresProperty ? 'Faltando' : '-'}
                </span>
              </div>
            )}
          </div>
        );
      },
      size: 100,
    }) as ColumnDef<Transaction>,

    // Amount column
    columnHelper.accessor('transaction.amount', {
      id: 'amount',
      header: 'Valor',
      cell: ({ getValue }) => (
        <div className="whitespace-nowrap text-xs text-right leading-tight">
          <div
            className={`font-medium ${
              getValue() >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(getValue())}
          </div>
        </div>
      ),
      size: 120,
    }) as ColumnDef<Transaction>,

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
    }) as ColumnDef<Transaction>,

    // Actions column
    columnHelper.display({
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          {editingId === row.id ? (
            <>
              <Button
                onClick={saveEdit}
                disabled={isPending}
                variant="ghost"
                size="sm"
                className="text-green-600 hover:text-green-800 cursor-pointer"
              >
                Salvar
              </Button>
              <Button
                onClick={cancelEdit}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancelar
              </Button>
            </>
          ) : (
            // Keep layout stable: always reserve two icon slots
            <div className="grid grid-cols-2 gap-2 w-[72px] justify-items-center">
              <Button
                onClick={() => startEdit(row.original)}
                variant="ghost"
                size="icon"
                className="text-blue-600 hover:text-blue-800 cursor-pointer"
                aria-label="Editar"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {row.original.isReviewed ? (
                // Invisible placeholder to prevent shifting when reviewed
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 pointer-events-none"
                  aria-hidden
                  tabIndex={-1}
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleMarkReviewed(row.original.id, true)}
                  disabled={isPending}
                  variant="ghost"
                  size="icon"
                  className="text-green-600 hover:text-green-800 cursor-pointer"
                  aria-label="Marcar como revisado"
                  title="Marcar como revisado"
                >
                  <Check className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      ),
      enableSorting: false,
      size: 120,
    }),
  ];
}
