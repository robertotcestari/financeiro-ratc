'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export type TransactionAction = 'import' | 'skip' | 'review';

export interface CategoryOption {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | string;
}

export interface PropertyOption {
  id: string;
  code: string;
}

export interface PreviewRow {
  transactionId: string;
  accountId: string;
  date: Date | string;
  description: string;
  amount: number;
  isDuplicate: boolean;
  recommendedAction: TransactionAction;
  duplicateConfidence?: number;
  duplicateReason?: string;
  initialCategoryId?: string | null;
  initialPropertyId?: string | null;
}

export interface OfxImportPreviewProps {
  className?: string;
  rows: PreviewRow[];
  categories: CategoryOption[];
  properties: PropertyOption[];
  summaryHint?: {
    totalTransactions: number;
    duplicateTransactions: number;
    uniqueTransactions: number;
  };
  onChangeCategory?: (
    transactionId: string,
    categoryId: string | null
  ) => void | Promise<void>;
  onChangeProperty?: (
    transactionId: string,
    propertyId: string | null
  ) => void | Promise<void>;
  onToggleSkip?: (transactionId: string, skip: boolean) => void | Promise<void>;
  onConfirm?: (
    actions: Record<string, TransactionAction>,
    updatedRows: Array<
      PreviewRow & {
        selectedCategoryId: string | null;
        selectedPropertyId: string | null;
        action: TransactionAction;
      }
    >
  ) => void | Promise<void>;
}

type RowState = {
  selectedCategoryId: string | null;
  selectedPropertyId: string | null;
  action: TransactionAction;
};

export function OfxImportPreview({
  className,
  rows,
  categories,
  properties,
  summaryHint,
  onChangeCategory,
  onChangeProperty,
  onToggleSkip,
  onConfirm,
}: OfxImportPreviewProps) {
  const [query, setQuery] = React.useState<string>('');
  const [rowState, setRowState] = React.useState<Record<string, RowState>>(
    () => {
      const map: Record<string, RowState> = {};
      for (const r of rows) {
        map[r.transactionId] = {
          selectedCategoryId: r.initialCategoryId ?? null,
          selectedPropertyId: r.initialPropertyId ?? null,
          action: r.recommendedAction,
        };
      }
      return map;
    }
  );

  // Derived filtered rows by search query (description, value or date label)
  const filteredRows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const dateLabel =
        typeof r.date === 'string' ? r.date : formatDate(r.date as Date);
      return (
        r.description.toLowerCase().includes(q) ||
        String(r.amount).includes(q) ||
        dateLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  // Compute dynamic summary from current state
  const summary = React.useMemo(() => {
    const total = rows.length;
    const duplicates = rows.filter((r) => r.isDuplicate).length;
    const unique = total - duplicates;

    let importCount = 0;
    let skipCount = 0;
    let reviewCount = 0;
    for (const r of rows) {
      const s = rowState[r.transactionId];
      const action = s?.action ?? r.recommendedAction;
      if (action === 'import') importCount++;
      else if (action === 'skip') skipCount++;
      else reviewCount++;
    }

    return {
      totalTransactions: summaryHint?.totalTransactions ?? total,
      duplicateTransactions: summaryHint?.duplicateTransactions ?? duplicates,
      uniqueTransactions: summaryHint?.uniqueTransactions ?? unique,
      selectedImport: importCount,
      selectedSkip: skipCount,
      selectedReview: reviewCount,
    };
  }, [rows, rowState, summaryHint]);

  function fallbackState(id: string): RowState {
    const r = rows.find((x) => x.transactionId === id)!;
    return {
      selectedCategoryId: r.initialCategoryId ?? null,
      selectedPropertyId: r.initialPropertyId ?? null,
      action: r.recommendedAction,
    };
  }

  function setAction(id: string, next: TransactionAction) {
    setRowState((s) => ({
      ...s,
      [id]: { ...(s[id] ?? fallbackState(id)), action: next },
    }));
  }
  function setCategory(id: string, categoryId: string | null) {
    setRowState((s) => ({
      ...s,
      [id]: { ...(s[id] ?? fallbackState(id)), selectedCategoryId: categoryId },
    }));
  }
  function setProperty(id: string, propertyId: string | null) {
    setRowState((s) => ({
      ...s,
      [id]: { ...(s[id] ?? fallbackState(id)), selectedPropertyId: propertyId },
    }));
  }

  async function handleToggleSkip(id: string) {
    const base =
      rowState[id]?.action ??
      rows.find((r) => r.transactionId === id)?.recommendedAction ??
      'review';
    const next: TransactionAction = base === 'skip' ? 'import' : 'skip';
    setAction(id, next);
    await onToggleSkip?.(id, next === 'skip');
  }

  async function handleCategoryChange(
    id: string,
    value: string
  ): Promise<void> {
    const v = value || null;
    const currentState = rowState[id] ?? fallbackState(id);
    setCategory(id, v);
    await onChangeCategory?.(id, v);
    
    // If the current action is review, promote to import
    if (currentState.action === 'review') {
      setAction(id, 'import');
    }
  }

  async function handlePropertyChange(
    id: string,
    value: string
  ): Promise<void> {
    const v = value || null;
    setProperty(id, v);
    await onChangeProperty?.(id, v);
  }

  async function handleConfirm(): Promise<void> {
    const actions: Record<string, TransactionAction> = {};
    const updatedRows = rows.map((r) => {
      const st = rowState[r.transactionId] ?? fallbackState(r.transactionId);
      actions[r.transactionId] = st.action;
      return {
        ...r,
        selectedCategoryId: st.selectedCategoryId,
        selectedPropertyId: st.selectedPropertyId,
        action: st.action,
      };
    });
    await onConfirm?.(actions, updatedRows);
  }

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Summary Header */}
      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <span data-testid="summary-total">
              Total: <strong>{summary.totalTransactions}</strong>
            </span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span data-testid="summary-duplicates">
              Duplicadas: <strong>{summary.duplicateTransactions}</strong>
            </span>
            <span className="mx-2 text-muted-foreground">|</span>
            <span data-testid="summary-unique">
              Únicas: <strong>{summary.uniqueTransactions}</strong>
            </span>
          </div>

          <div className="text-xs text-muted-foreground">
            Selecionadas — Importar:{' '}
            <strong data-testid="selected-import">
              {summary.selectedImport}
            </strong>
            &nbsp;|&nbsp; Pular:{' '}
            <strong data-testid="selected-skip">{summary.selectedSkip}</strong>
            &nbsp;|&nbsp; Revisar:{' '}
            <strong data-testid="selected-review">
              {summary.selectedReview}
            </strong>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="tx-search" className="text-xs">
            Pesquisar
          </Label>
          <Input
            id="tx-search"
            data-testid="preview-search"
            placeholder="Filtrar por descrição, data, valor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-64"
          />
        </div>

        <Button
          type="button"
          onClick={() => void handleConfirm()}
          data-testid="confirm-import"
        >
          Confirmar Importação
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="ofx-preview-table">
          <thead className="border-b bg-muted/40 text-xs">
            <tr>
              <th className="px-2 py-2 text-left">Data</th>
              <th className="px-2 py-2 text-left">Descrição</th>
              <th className="px-2 py-2 text-right">Valor</th>
              <th className="px-2 py-2 text-left">Categoria</th>
              <th className="px-2 py-2 text-left">Imóvel</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => {
              const st =
                rowState[r.transactionId] ?? fallbackState(r.transactionId);
              const isNegative = Number(r.amount) < 0;
              const dateLabel =
                typeof r.date === 'string'
                  ? r.date
                  : formatDate(r.date as Date);

              return (
                <tr
                  key={r.transactionId}
                  data-testid={`row-${r.transactionId}`}
                  className={cn('border-b', r.isDuplicate ? 'bg-amber-50' : '')}
                >
                  <td className="whitespace-nowrap px-2 py-2">{dateLabel}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      <span>{r.description}</span>
                      {r.isDuplicate && (
                        <span
                          className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                          data-testid="duplicate-badge"
                          title={
                            r.duplicateReason ??
                            'Transação potencialmente duplicada'
                          }
                        >
                          Duplicada
                          {r.duplicateConfidence
                            ? ` • ${Math.round(
                                (r.duplicateConfidence ?? 0) * 100
                              )}%`
                            : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right',
                      isNegative ? 'text-red-600' : 'text-emerald-700'
                    )}
                  >
                    {formatCurrency(r.amount)}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      data-testid={`category-select-${r.transactionId}`}
                      className="w-56 rounded-md border bg-background p-1.5 text-xs"
                      value={st.selectedCategoryId ?? ''}
                      onChange={(e) =>
                        void handleCategoryChange(
                          r.transactionId,
                          e.target.value
                        )
                      }
                    >
                      <option value="">-- Selecionar categoria --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      data-testid={`property-select-${r.transactionId}`}
                      className="w-40 rounded-md border bg-background p-1.5 text-xs"
                      value={st.selectedPropertyId ?? ''}
                      onChange={(e) =>
                        void handlePropertyChange(
                          r.transactionId,
                          e.target.value
                        )
                      }
                    >
                      <option value="">-- Sem imóvel --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-medium',
                        st.action === 'import' &&
                          'bg-emerald-100 text-emerald-800',
                        st.action === 'skip' && 'bg-rose-100 text-rose-800',
                        st.action === 'review' && 'bg-slate-100 text-slate-700'
                      )}
                      data-testid={`action-cell-${r.transactionId}`}
                    >
                      {labelForAction(st.action)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        st.action === 'skip' ? 'secondary' : 'destructive'
                      }
                      onClick={() => void handleToggleSkip(r.transactionId)}
                      data-testid={`toggle-skip-${r.transactionId}`}
                    >
                      {st.action === 'skip' ? 'Desfazer pulo' : 'Pular'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function labelForAction(a: TransactionAction): string {
  if (a === 'import') return 'Importar';
  if (a === 'skip') return 'Pular';
  return 'Revisar';
}

export default OfxImportPreview;
