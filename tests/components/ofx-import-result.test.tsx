/* @vitest-environment jsdom */
import React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { OfxImportResult } from '@/components/features/ofx/OfxImportResult';

type ImportSummaryProp = {
  totalTransactions: number;
  validTransactions: number;
  invalidTransactions: number;
  duplicateTransactions: number;
  uniqueTransactions: number;
  categorizedTransactions: number;
  uncategorizedTransactions: number;
};

type SimpleTxn = {
  id?: string;
  date: Date | string;
  description: string;
  amount: number;
};

type ImportError = {
  type?: 'PARSING' | 'VALIDATION' | 'SYSTEM' | string;
  code: string;
  message: string;
};

type FailedTxn = {
  transaction: SimpleTxn;
  error: ImportError;
};

function mkTxn(
  id: string,
  desc: string,
  amount: number,
  date = new Date('2024-01-15')
): SimpleTxn {
  return { id, date, description: desc, amount };
}

function summary(
  overrides: Partial<ImportSummaryProp> = {}
): ImportSummaryProp {
  return {
    totalTransactions: 20,
    validTransactions: 18,
    invalidTransactions: 2,
    duplicateTransactions: 3,
    uniqueTransactions: 17,
    categorizedTransactions: 12,
    uncategorizedTransactions: 8,
    ...overrides,
  };
}

describe('OfxImportResult UI', () => {
  it('renders summary, error, failed and imported previews', () => {
    const imported: SimpleTxn[] = [
      mkTxn('t1', 'Aluguel Jan', 1200),
      mkTxn('t2', 'Energia', -250.35),
    ];
    const skipped: SimpleTxn[] = [mkTxn('s1', 'Possível duplicada', -10)];
    const longMsg = 'X'.repeat(200);
    const failed: FailedTxn[] = [
      {
        transaction: mkTxn('f1', 'Falha 1', -99.99),
        error: { code: 'E001', message: longMsg, type: 'SYSTEM' },
      },
    ];

    render(
      <OfxImportResult
        summary={summary()}
        imported={imported}
        skipped={skipped}
        failed={failed}
        errorMessage="Falha ao processar lote"
      />
    );

    // Summary cards
    expect(screen.getByTestId('sum-total')).toHaveTextContent('20');
    expect(screen.getByTestId('sum-valid')).toHaveTextContent('18');
    expect(screen.getByTestId('sum-invalid')).toHaveTextContent('2');
    expect(screen.getByTestId('sum-dup')).toHaveTextContent('3');
    expect(screen.getByTestId('sum-unique')).toHaveTextContent('17');
    expect(screen.getByTestId('sum-categorized')).toHaveTextContent('12');
    expect(screen.getByTestId('sum-uncategorized')).toHaveTextContent('8');

    // Derived counters
    expect(screen.getByTestId('sum-imported')).toHaveTextContent('2');
    expect(screen.getByTestId('sum-skipped')).toHaveTextContent('1');
    expect(screen.getByTestId('sum-failed')).toHaveTextContent('1');

    // Batch error present
    expect(screen.getByTestId('batch-error')).toHaveTextContent(
      /Falha ao processar lote/i
    );

    // Failed table shows truncated error message
    const failedTable = screen.getByTestId('failed-table');
    const rows = within(failedTable).getAllByRole('row');
    // header + 1 row
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('failed-code-0')).toHaveTextContent('E001');
    expect(
      screen.getByTestId('failed-msg-0').textContent?.length
    ).toBeLessThanOrEqual(181); // truncated with ellipsis
  });

  it('limits imported preview to 10 and shows "+N" indicator when more', () => {
    const manyImported: SimpleTxn[] = Array.from({ length: 12 }, (_, i) =>
      mkTxn(`ti${i + 1}`, `TX ${i + 1}`, i % 2 === 0 ? 100 + i : -(100 + i))
    );

    render(
      <OfxImportResult
        summary={summary({
          totalTransactions: 12,
          validTransactions: 12,
          invalidTransactions: 0,
        })}
        imported={manyImported}
        skipped={[]}
        failed={[]}
      />
    );

    // Imported sample table present
    const table = screen.getByTestId('imported-table');
    const rows = within(table).getAllByRole('row');
    // header + 10
    expect(rows.length).toBe(11);
    expect(screen.getByTestId('imported-more')).toHaveTextContent(
      '+2 transações não exibidas'
    );
  });

  it('buttons call callbacks and view button disables with zero imports', () => {
    const onDone = vi.fn();
    const onView = vi.fn();

    // Case 1: imported > 0 => view enabled
    const { rerender } = render(
      <OfxImportResult
        summary={summary()}
        imported={[mkTxn('a', 'ok', 10)]}
        skipped={[]}
        failed={[]}
        onDone={onDone}
        onViewTransactions={onView}
      />
    );

    const viewBtn = screen.getByTestId('btn-view-transactions');
    const doneBtn = screen.getByTestId('btn-done');

    expect(viewBtn).toBeEnabled();
    fireEvent.click(viewBtn);
    fireEvent.click(doneBtn);
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);

    // Case 2: imported == 0 => view disabled
    rerender(
      <OfxImportResult
        summary={summary()}
        imported={[]}
        skipped={[]}
        failed={[]}
        onDone={onDone}
        onViewTransactions={onView}
      />
    );
    expect(screen.getByTestId('btn-view-transactions')).toBeDisabled();
  });
});
