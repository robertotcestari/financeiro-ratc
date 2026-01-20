'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right';
  }
}

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/formatters';
import type {
  TributacaoDefaultValues,
  TributacaoDefaultField,
  TributacaoNumericField,
} from '@/lib/core/database/tributacao-defaults';
import { updateDefaultValueAction, updateZeroFlagAction } from '../actions';

const ZERO_VALUES: TributacaoDefaultValues = {
  condominio: 0,
  iptu: 0,
  nonTaxable: 0,
  forceZero: false,
};

const NUMERIC_FIELDS: TributacaoNumericField[] = ['condominio', 'iptu', 'nonTaxable'];

type InputFieldState = Record<TributacaoNumericField, string>;

function cloneDefaults(
  defaults: Record<string, TributacaoDefaultValues>
): Record<string, TributacaoDefaultValues> {
  const copy: Record<string, TributacaoDefaultValues> = {};
  for (const [key, value] of Object.entries(defaults)) {
    copy[key] = { ...ZERO_VALUES, ...value };
  }
  return copy;
}

function formatInputValue(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toString();
}

function buildInputStateFromDefaults(
  defaults: Record<string, TributacaoDefaultValues>
): Record<string, InputFieldState> {
  const map: Record<string, InputFieldState> = {};
  for (const [key, entry] of Object.entries(cloneDefaults(defaults))) {
    map[key] = {
      condominio: formatInputValue(entry.condominio),
      iptu: formatInputValue(entry.iptu),
      nonTaxable: formatInputValue(entry.nonTaxable),
    };
  }
  return map;
}

export interface TributacaoRowInput {
  id: string;
  propertyId: string | null;
  propertyCode: string;
  propertyAddress: string;
  propertyCity: string;
  amount: number;
}

interface TaxationTableProps {
  rows: TributacaoRowInput[];
  defaults: Record<string, TributacaoDefaultValues>;
}

interface TableRowData {
  id: string;
  propertyId: string | null;
  propertyLabel: string;
  amount: number;
  condominio: number;
  iptu: number;
  nonTaxable: number;
  taxable: number;
  forceZero: boolean;
}

interface AggregatedRow {
  key: string;
  propertyId: string | null;
  propertyCode: string;
  propertyAddress: string;
  propertyCity: string;
  amount: number;
}

function makeMapKey(row: AggregatedRow) {
  return row.propertyId ?? row.propertyCode ?? row.key;
}

function sanitizeInput(value: string): number {
  if (!value) return 0;
  const normalized = value.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(parsed, 0);
}

export function TaxationTable({ rows, defaults }: TaxationTableProps) {
  const [valuesMap, setValuesMap] = useState<Record<string, TributacaoDefaultValues>>(() =>
    cloneDefaults(defaults)
  );
  const [inputValues, setInputValues] = useState<Record<string, InputFieldState>>(() =>
    buildInputStateFromDefaults(defaults)
  );
  const valuesMapRef = useRef<Record<string, TributacaoDefaultValues>>(valuesMap);
  const inputValuesRef = useRef<Record<string, InputFieldState>>(inputValues);
  const [pendingField, setPendingField] = useState<{
    key: string;
    field: TributacaoDefaultField;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const lastSavedRef = useRef<Record<string, TributacaoDefaultValues>>(
    cloneDefaults(defaults)
  );

  useEffect(() => {
    const cloned = cloneDefaults(defaults);
    const nextInputs = buildInputStateFromDefaults(defaults);
    setValuesMap((prev) => {
      const merged = { ...prev, ...cloned };
      valuesMapRef.current = merged;
      return merged;
    });
    setInputValues((prev) => {
      const merged = { ...prev, ...nextInputs };
      inputValuesRef.current = merged;
      return merged;
    });
    lastSavedRef.current = cloneDefaults(defaults);
  }, [defaults]);

  useEffect(() => {
    valuesMapRef.current = valuesMap;
  }, [valuesMap]);

  useEffect(() => {
    inputValuesRef.current = inputValues;
  }, [inputValues]);

  const aggregatedRows = useMemo<AggregatedRow[]>(() => {
    const map = new Map<string, AggregatedRow>();

    rows.forEach((row) => {
      const key = row.propertyId ?? row.propertyCode ?? row.id;
      const existing = map.get(key);

      if (existing) {
        existing.amount += row.amount;
        if (!existing.propertyCode && row.propertyCode) existing.propertyCode = row.propertyCode;
        if (!existing.propertyAddress && row.propertyAddress) existing.propertyAddress = row.propertyAddress;
        if (!existing.propertyCity && row.propertyCity) existing.propertyCity = row.propertyCity;
      } else {
        map.set(key, {
          key,
          propertyId: row.propertyId ?? null,
          propertyCode: row.propertyCode,
          propertyAddress: row.propertyAddress,
          propertyCity: row.propertyCity,
          amount: row.amount,
        });
      }
    });

    return Array.from(map.values());
  }, [rows]);

  const tableData: TableRowData[] = useMemo(() => {
    return aggregatedRows.map((row) => {
      const key = makeMapKey(row);
      const stored = valuesMap[key];
      const fallback = row.propertyId ? defaults[row.propertyId] : undefined;
      const base: TributacaoDefaultValues = {
        ...ZERO_VALUES,
        ...(fallback ?? {}),
        ...(stored ?? {}),
      };
      const calculated = Math.max(
        0,
        Number(row.amount) - base.condominio - base.iptu - base.nonTaxable
      );
      const taxable = base.forceZero ? 0 : calculated;

      const propertyLabel = [row.propertyCode, row.propertyAddress, row.propertyCity]
        .filter(Boolean)
        .join(' — ');

      return {
        id: row.key,
        propertyId: row.propertyId,
        propertyLabel: propertyLabel || '—',
        amount: row.amount,
        condominio: base.condominio,
        iptu: base.iptu,
        nonTaxable: base.nonTaxable,
        taxable,
        forceZero: base.forceZero,
      };
    });
  }, [aggregatedRows, valuesMap, defaults]);

  const rowById = useMemo<Record<string, AggregatedRow>>(() => {
    const map: Record<string, AggregatedRow> = {};
    aggregatedRows.forEach((row) => {
      map[row.key] = row;
    });
    return map;
  }, [aggregatedRows]);

  const totals = useMemo(
    () =>
      tableData.reduce(
        (acc, row) => {
          acc.amount += row.amount;
          acc.condominio += row.condominio;
          acc.iptu += row.iptu;
          acc.nonTaxable += row.nonTaxable;
          acc.taxable += row.taxable;
          return acc;
        },
        { amount: 0, condominio: 0, iptu: 0, nonTaxable: 0, taxable: 0 }
      ),
    [tableData]
  );

  const updateLocalValue = useCallback((
    row: AggregatedRow,
    field: TributacaoNumericField,
    rawValue: string
  ) => {
    const key = makeMapKey(row);
    const fallback = row.propertyId ? defaults[row.propertyId] : undefined;
    const fallbackEntry = fallback ?? ZERO_VALUES;
    const numeric = sanitizeInput(rawValue);

    setInputValues((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] ?? {
            condominio: formatInputValue(fallbackEntry.condominio),
            iptu: formatInputValue(fallbackEntry.iptu),
            nonTaxable: formatInputValue(fallbackEntry.nonTaxable),
          }),
          [field]: rawValue,
        },
      };
      inputValuesRef.current = next;
      return next;
    });

    setValuesMap((prev) => {
      const baseEntry: TributacaoDefaultValues = {
        ...ZERO_VALUES,
        ...fallbackEntry,
        ...(prev[key] ?? {}),
      };
      const nextEntry: TributacaoDefaultValues = {
        ...baseEntry,
        [field]: numeric,
      };
      const nextMap = {
        ...prev,
        [key]: nextEntry,
      };
      valuesMapRef.current = nextMap;
      return nextMap;
    });
  }, [defaults]);

  const persistValue = useCallback((
    row: AggregatedRow,
    field: TributacaoNumericField
  ) => {
    const key = makeMapKey(row);
    const fallback = row.propertyId ? defaults[row.propertyId] : undefined;
    const map = valuesMapRef.current;
    const entry: TributacaoDefaultValues = {
      ...ZERO_VALUES,
      ...(fallback ?? {}),
      ...(map[key] ?? {}),
    };
    const currentValue = entry[field];

    setInputValues((prev) => {
      const next = {
        ...prev,
        [key]: {
          ...(prev[key] ?? {
            condominio: formatInputValue(entry.condominio),
            iptu: formatInputValue(entry.iptu),
            nonTaxable: formatInputValue(entry.nonTaxable),
          }),
          [field]: formatInputValue(currentValue),
        },
      };
      inputValuesRef.current = next;
      return next;
    });

    if (!row.propertyId) {
      return;
    }

    const lastSavedEntry = lastSavedRef.current[row.propertyId] ?? ZERO_VALUES;
    const lastSaved = lastSavedEntry[field];
    const delta = Math.abs(currentValue - lastSaved);
    if (delta < 0.005) {
      return;
    }

    setPendingField({ key, field });
    startTransition(async () => {
      try {
        await updateDefaultValueAction({
          propertyId: row.propertyId!,
          field,
          value: currentValue,
        });
        lastSavedRef.current[row.propertyId!] = {
          ...lastSavedEntry,
          [field]: currentValue,
          forceZero: entry.forceZero,
        };
      } finally {
        setPendingField(null);
      }
    });
  }, [defaults, startTransition]);

  const toggleZero = useCallback(
    (row: AggregatedRow, forceZero: boolean) => {
      const key = makeMapKey(row);
      const fallback = row.propertyId ? defaults[row.propertyId] : undefined;

      setValuesMap((prev) => {
        const baseEntry: TributacaoDefaultValues = {
          ...ZERO_VALUES,
          ...(fallback ?? {}),
          ...(prev[key] ?? {}),
        };
        const nextMap = {
          ...prev,
          [key]: {
            ...baseEntry,
            forceZero,
          },
        };
        valuesMapRef.current = nextMap;
        return nextMap;
      });

      if (!row.propertyId) {
        return;
      }

      setPendingField({ key, field: 'forceZero' });
      startTransition(async () => {
        try {
          await updateZeroFlagAction({
            propertyId: row.propertyId!,
            forceZero,
          });
          const lastSavedEntry = lastSavedRef.current[row.propertyId!] ?? ZERO_VALUES;
          lastSavedRef.current[row.propertyId!] = {
            ...lastSavedEntry,
            forceZero,
          };
        } finally {
          setPendingField(null);
        }
      });
    },
    [defaults, startTransition]
  );

  const columns = useMemo<ColumnDef<TableRowData>[]>(
    () => [
      {
        header: 'Imóvel',
        accessorKey: 'propertyLabel',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium text-gray-900">{getValue() as string}</span>
        ),
        size: 240,
      },
      {
        header: 'Valor Recebido',
        accessorKey: 'amount',
        meta: { align: 'right' },
        cell: ({ getValue }) => (
          <span className="font-semibold text-green-700">
            {formatCurrency(getValue<number>())}
          </span>
        ),
      },
      ...NUMERIC_FIELDS.map((field) => ({
        header:
          field === 'condominio'
            ? 'Condomínio'
            : field === 'iptu'
            ? 'IPTU'
            : 'Valores não tributáveis',
        accessorKey: field,
        meta: { align: 'right' as const },
        cell: ({ row }: { row: Row<TributacaoRow> }) => {
          const baseRow = rowById[row.original.id];
          if (!baseRow) return null;
          const key = makeMapKey(baseRow);
          const numericValue =
            field === 'condominio'
              ? row.original.condominio
              : field === 'iptu'
              ? row.original.iptu
              : row.original.nonTaxable;
          const displayValue =
            inputValuesRef.current[key]?.[field] ?? formatInputValue(numericValue);
          const isDisabled =
            isPending && pendingField?.key === key && pendingField.field === field;

          return (
            <Input
              type="text"
              inputMode="decimal"
              value={displayValue}
              onChange={(event) => updateLocalValue(baseRow, field, event.target.value)}
              onBlur={() => persistValue(baseRow, field)}
              className="h-8 w-32 text-right"
              disabled={isDisabled}
            />
          );
        },
      })),
      {
        header: 'Zerar Receita',
        accessorKey: 'forceZero',
        meta: { align: 'center' },
        cell: ({ row }) => {
          const baseRow = rowById[row.original.id];
          if (!baseRow) return null;
          const key = makeMapKey(baseRow);
          const isDisabled =
            isPending && pendingField?.key === key && pendingField.field === 'forceZero';
          const checked = Boolean(row.getValue<boolean>('forceZero'));

          return (
            <div className="flex justify-center">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => toggleZero(baseRow, value === true)}
                disabled={isDisabled}
              />
            </div>
          );
        },
      },
      {
        header: 'Receita Tributável',
        accessorKey: 'taxable',
        meta: { align: 'right' },
        cell: ({ getValue }) => (
          <span className="font-semibold text-blue-700">
            {formatCurrency(getValue<number>())}
          </span>
        ),
      },
    ],
    [isPending, pendingField, persistValue, rowById, toggleZero, updateLocalValue]
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={(() => {
                    const align = header.column.columnDef.meta?.align;
                    if (align === 'right') return 'text-right';
                    if (align === 'center') return 'text-center';
                    return undefined;
                  })()}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={table.getAllColumns().length} className="py-10 text-center text-sm text-gray-500">
                Nenhum aluguel recebido encontrado para o período selecionado.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={(() => {
                    const align = cell.column.columnDef.meta?.align;
                    if (align === 'right') return 'text-right';
                    if (align === 'center') return 'text-center';
                    return undefined;
                  })()}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
            ))
          )}
        </TableBody>
        {table.getRowModel().rows.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Total</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.amount)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.condominio)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.iptu)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(totals.nonTaxable)}</TableCell>
              <TableCell className="text-center" />
              <TableCell className="text-right font-semibold">{formatCurrency(totals.taxable)}</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
