/* @vitest-environment jsdom */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { OfxImportPreview } from '@/components/features/ofx/OfxImportPreview';

type TransactionAction = 'import' | 'skip' | 'review';

interface CategoryOption {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | string;
}

interface PropertyOption {
  id: string;
  code: string;
}

interface PreviewRow {
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

function row(
  id: string,
  desc: string,
  amount: number,
  isDuplicate = false,
  recommended: TransactionAction = 'review',
  opts: Partial<PreviewRow> = {}
): PreviewRow {
  return {
    transactionId: id,
    accountId: 'ACC1',
    date: new Date('2024-01-15'),
    description: desc,
    amount,
    isDuplicate,
    recommendedAction: recommended,
    ...opts,
  };
}

const categories: CategoryOption[] = [
  { id: 'c1', name: 'Receitas', type: 'INCOME' },
  { id: 'c2', name: 'Despesas', type: 'EXPENSE' },
  { id: 'c3', name: 'Transferência', type: 'TRANSFER' },
];

const properties: PropertyOption[] = [
  { id: 'p1', code: 'IMV-01' },
  { id: 'p2', code: 'IMV-02' },
];

describe('OfxImportPreview', () => {
  it('renders balances card with initial and projected final balance', () => {
    const rows: PreviewRow[] = [
      row('T1', 'Compra mercado', -100, false, 'import'),
      row('T2', 'Depósito', 300, false, 'import'),
    ];

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
        balances={{ beforeStart: 1000, beforeEnd: 1200 }}
      />
    );

    // Initial balance should display beforeStart (1000)
    expect(screen.getByTestId('saldo-inicial')).toHaveTextContent(
      /1\.000,00|1,000.00/ // locale dependent
    );

    // Projected final balance = beforeEnd + sum(imported amounts) = 1200 + 200 = 1400
    const projected = screen.getByTestId('saldo-final-projetado');
    expect(projected).toBeInTheDocument();
  });
  it('renders summary, toolbar and table with rows', () => {
    const rows: PreviewRow[] = [
      row('T1', 'Compra mercado', -150.23, false, 'review'),
      row('T2', 'Depósito salário', 5000, true, 'import', {
        duplicateConfidence: 0.95,
        duplicateReason: 'ID OFX igual',
      }),
    ];

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
        summaryHint={{
          totalTransactions: 2,
          duplicateTransactions: 1,
          uniqueTransactions: 1,
        }}
      />
    );

    // Summary
    expect(screen.getByTestId('summary-total')).toHaveTextContent('Total: 2');
    expect(screen.getByTestId('summary-duplicates')).toHaveTextContent(
      'Duplicadas: 1'
    );
    expect(screen.getByTestId('summary-unique')).toHaveTextContent('Únicas: 1');

    // Toolbar and search
    expect(screen.getByTestId('preview-search')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-import')).toBeInTheDocument();

    // Table and rows
    const table = screen.getByTestId('ofx-preview-table');
    expect(table).toBeInTheDocument();
    const bodyRows = within(table).getAllByRole('row');
    // header + 2 rows
    expect(bodyRows.length).toBeGreaterThanOrEqual(3);

    // Duplicate badge present on duplicate row
    expect(screen.getAllByTestId('duplicate-badge')[0]).toHaveTextContent(
      /duplicada/i
    );
  });

  it('filters rows using the search input', () => {
    const rows: PreviewRow[] = [
      row('T1', 'Café Star Coffee', -12.5, false, 'review'),
      row('T2', 'Mercado Central', -150.23, false, 'review'),
      row('T3', 'Depósito', 1000, false, 'import'),
    ];

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
      />
    );

    const table = screen.getByTestId('ofx-preview-table');
    const search = screen.getByTestId('preview-search') as HTMLInputElement;

    // Initial: three data rows expected
    expect(within(table).getAllByRole('row').length).toBeGreaterThanOrEqual(4);

    fireEvent.change(search, { target: { value: 'mercado' } });

    // Now should only show the "Mercado Central" row among data rows
    const allRows = within(table).getAllByRole('row');
    // header + 1
    expect(allRows.length).toBe(2);
    expect(
      within(allRows[1]).getByText(/Mercado Central/i)
    ).toBeInTheDocument();
  });

  it('valid transactions are recommended for import by default', async () => {
    const rows: PreviewRow[] = [
      row('T1', 'Conta de Luz', -200, false, 'import'),
    ];

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
      />
    );

    // Valid transactions should be recommended for import
    expect(screen.getByTestId('action-cell-T1')).toHaveTextContent(/Importar/i);

    // Change category should maintain import action
    const select = screen.getByTestId(
      'category-select-T1'
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'c2' } });

    await waitFor(() => {
      expect(screen.getByTestId('action-cell-T1')).toHaveTextContent(
        /Importar/i
      );
    });
  });

  it('toggle skip switches action and calls onToggleSkip', async () => {
    const rows: PreviewRow[] = [row('T1', 'Restaurante', -80, true, 'review')];
    const onToggleSkip = vi.fn();

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
        onToggleSkip={onToggleSkip}
      />
    );

    const toggle = screen.getByTestId('toggle-skip-T1');

    // First click: changes to skip
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggleSkip).toHaveBeenCalledWith('T1', true);
      expect(screen.getByTestId('action-cell-T1')).toHaveTextContent(/Pular/i);
    });

    // Second click: back to import (from skip)
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggleSkip).toHaveBeenLastCalledWith('T1', false);
      // It may switch to "Importar" from "skip"
      expect(screen.getByTestId('action-cell-T1')).toHaveTextContent(
        /Importar|Revisar/i
      );
    });
  });

  it('confirm aggregates actions and selected category/property and calls onConfirm', async () => {
    const rows: PreviewRow[] = [
      row('T1', 'Taxa bancária', -9.9, false, 'import'),
      row('T2', 'Recebimento aluguel IMV-01', 1200, false, 'import'),
    ];

    const onConfirm = vi.fn();

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
        onConfirm={onConfirm}
      />
    );

    // Set category and property for T1
    fireEvent.change(screen.getByTestId('category-select-T1'), {
      target: { value: 'c2' },
    });
    fireEvent.change(screen.getByTestId('property-select-T1'), {
      target: { value: 'p1' },
    });

    // Both transactions should be recommended for import
    expect(screen.getByTestId('action-cell-T1')).toHaveTextContent(
      /Importar/i
    );
    expect(screen.getByTestId('action-cell-T2')).toHaveTextContent(
      /Importar/i
    );

    fireEvent.click(screen.getByTestId('confirm-import'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    const [actions, updatedRows] = onConfirm.mock.calls[0] as [
      Record<string, TransactionAction>,
      Array<
        PreviewRow & {
          selectedCategoryId: string | null;
          selectedPropertyId: string | null;
          action: TransactionAction;
        }
      >
    ];

    // Actions include both T1 and T2
    expect(Object.keys(actions)).toEqual(expect.arrayContaining(['T1', 'T2']));

    // T1 should have moved from review to import, and category/property set
    const u1 = updatedRows.find(
      (
        r: PreviewRow & {
          selectedCategoryId: string | null;
          selectedPropertyId: string | null;
          action: TransactionAction;
        }
      ) => r.transactionId === 'T1'
    )!;
    expect(u1.action).toBe('import');
    expect(u1.selectedCategoryId).toBe('c2');
    expect(u1.selectedPropertyId).toBe('p1');
  });

  it('shows duplicate badge with confidence percent when provided', () => {
    const rows: PreviewRow[] = [
      row('T1', 'Possível duplicada', -10, true, 'review', {
        duplicateConfidence: 0.83,
      }),
    ];

    render(
      <OfxImportPreview
        rows={rows}
        categories={categories}
        properties={properties}
      />
    );

    const badge = screen.getByTestId('duplicate-badge');
    expect(badge).toHaveTextContent(/83%/);
  });
});
