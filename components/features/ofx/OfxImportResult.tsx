'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';

export interface ImportSummaryProp {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  duplicateTransactions: number;
  uniqueTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
}

export interface ImportError {
  type?: 'PARSING' | 'VALIDATION' | 'SYSTEM' | string;
  code: string;
  message: string;
}

export interface SimpleTxn {
  id?: string;
  date: Date | string;
  description: string;
  amount: number;
}

export interface FailedTxn {
  transaction: SimpleTxn;
  error: ImportError;
}

export interface OfxImportResultProps {
  className?: string;
  summary: ImportSummaryProp;
  imported: SimpleTxn[];
  skipped: SimpleTxn[];
  failed: FailedTxn[];
  errorMessage?: string | null;
  onViewTransactions?: () => void | Promise<void>;
  onDone?: () => void | Promise<void>;
}

export function OfxImportResult({
  className,
  summary,
  imported,
  skipped,
  failed,
  errorMessage,
  onViewTransactions,
  onDone,
}: OfxImportResultProps) {
  const importedCount = imported.length;
  const skippedCount = skipped.length;
  const failedCount = failed.length;

  return (
    <div
      className={cn('w-full space-y-4', className)}
      data-testid="ofx-import-result"
    >
      {/* Summary */}
      <div className="rounded-md border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Total"
            value={summary.totalTransactions}
            testId="sum-total"
          />
          <Stat
            label="Válidas"
            value={summary.validTransactions}
            testId="sum-valid"
          />
          <Stat
            label="Inválidas"
            value={summary.invalidTransactions}
            testId="sum-invalid"
          />
          <Stat
            label="Duplicadas"
            value={summary.duplicateTransactions}
            testId="sum-dup"
          />
          <Stat
            label="Únicas"
            value={summary.uniqueTransactions}
            testId="sum-unique"
          />
          <Stat
            label="Categorizadas"
            value={summary.categorizedTransactions}
            testId="sum-categorized"
          />
          <Stat
            label="Sem Categoria"
            value={summary.uncategorizedTransactions}
            testId="sum-uncategorized"
          />
          <Stat
            label="Importadas"
            value={importedCount}
            testId="sum-imported"
          />
          <Stat label="Puladas" value={skippedCount} testId="sum-skipped" />
          <Stat label="Falhas" value={failedCount} testId="sum-failed" />
        </div>
      </div>

      {/* Error message for batch failure */}
      {errorMessage ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
          data-testid="batch-error"
          aria-live="polite"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Failed list (errors) */}
      {failedCount > 0 && (
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Falhas ({failedCount})</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="failed-table">
              <thead className="border-b bg-muted/40 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-right">Valor</th>
                  <th className="px-2 py-2 text-left">Erro</th>
                </tr>
              </thead>
              <tbody>
                {failed.slice(0, 20).map((f, idx) => {
                  const dateLabel =
                    typeof f.transaction.date === 'string'
                      ? f.transaction.date
                      : formatDate(f.transaction.date as Date);
                  const isNeg = Number(f.transaction.amount) < 0;
                  return (
                    <tr key={f.transaction.id ?? idx} className="border-b">
                      <td className="whitespace-nowrap px-2 py-2">
                        {dateLabel}
                      </td>
                      <td className="px-2 py-2">{f.transaction.description}</td>
                      <td
                        className={cn(
                          'px-2 py-2 text-right',
                          isNeg ? 'text-red-600' : 'text-emerald-700'
                        )}
                      >
                        {formatCurrency(f.transaction.amount)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col text-xs">
                          <span
                            className="font-medium"
                            data-testid={`failed-code-${idx}`}
                          >
                            {f.error.code}
                          </span>
                          <span
                            className="text-muted-foreground"
                            data-testid={`failed-msg-${idx}`}
                          >
                            {truncate(f.error.message, 180)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {failedCount > 20 ? (
            <div
              className="pt-2 text-xs text-muted-foreground"
              data-testid="failed-more"
            >
              +{failedCount - 20} erros adicionais não exibidos
            </div>
          ) : null}
        </div>
      )}

      {/* Imported (preview top) */}
      {importedCount > 0 && (
        <div className="rounded-md border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Importadas (amostra)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="imported-table">
              <thead className="border-b bg-muted/40 text-xs">
                <tr>
                  <th className="px-2 py-2 text-left">Data</th>
                  <th className="px-2 py-2 text-left">Descrição</th>
                  <th className="px-2 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {imported.slice(0, 10).map((t, idx) => {
                  const dateLabel =
                    typeof t.date === 'string'
                      ? t.date
                      : formatDate(t.date as Date);
                  const isNeg = Number(t.amount) < 0;
                  return (
                    <tr key={t.id ?? idx} className="border-b">
                      <td className="whitespace-nowrap px-2 py-2">
                        {dateLabel}
                      </td>
                      <td className="px-2 py-2">{t.description}</td>
                      <td
                        className={cn(
                          'px-2 py-2 text-right',
                          isNeg ? 'text-red-600' : 'text-emerald-700'
                        )}
                      >
                        {formatCurrency(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {importedCount > 10 ? (
            <div
              className="pt-2 text-xs text-muted-foreground"
              data-testid="imported-more"
            >
              +{importedCount - 10} transações não exibidas
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void onDone?.()}
          data-testid="btn-done"
        >
          Concluir
        </Button>
        <Button
          type="button"
          onClick={() => void onViewTransactions?.()}
          disabled={importedCount === 0}
          data-testid="btn-view-transactions"
        >
          Ver transações
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  testId,
}: {
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

export default OfxImportResult;
