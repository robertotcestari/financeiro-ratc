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
import { AccountSelection } from '@/components/ofx/AccountSelection';

type AccountType = 'CHECKING' | 'SAVINGS' | 'INVESTMENT' | string;

interface MinimalBankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: AccountType;
  isActive: boolean;
}

function makeAccount(
  id: string,
  name: string,
  bankName: string,
  type: AccountType,
  isActive = true
): MinimalBankAccount {
  return { id, name, bankName, accountType: type, isActive };
}

describe('AccountSelection UI', () => {
  const accounts: MinimalBankAccount[] = [
    // Intentionally unsorted to verify sorting (active desc, bank asc, name asc)
    makeAccount('3', 'Conta B', 'Banco B', 'SAVINGS', true),
    makeAccount('1', 'Conta A Inativa', 'Banco A', 'CHECKING', false),
    makeAccount('2', 'Conta A', 'Banco A', 'CHECKING', true),
    makeAccount('4', 'Conta C', 'Banco A', 'INVESTMENT', true),
  ];

  it('renders dropdown with sorted accounts and confirms selection', async () => {
    const onConfirm = vi.fn();
    render(
      <AccountSelection
        initialAccounts={accounts}
        onConfirm={onConfirm}
        onCreateNewAccount={async () => ({ success: false, error: 'noop' })}
      />
    );

    // Select element present
    const select = screen.getByTestId('account-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // First option is placeholder
    const options = within(select).getAllByRole('option');
    expect(options[0]).toHaveTextContent('-- Selecione --');

    // Verify sorting and labels (inactive marked, bank • name (type))
    const labels = options.slice(1).map((o) => o.textContent?.trim());
    expect(labels).toEqual([
      // Active first: Banco A (name asc), then Banco B
      'Banco A • Conta A (CHECKING)',
      'Banco A • Conta C (INVESTMENT)',
      'Banco B • Conta B (SAVINGS)',
      // Inactive last with [Inativa]
      '[Inativa] Banco A • Conta A Inativa (CHECKING)',
    ]);

    // Confirm without selection shows error
    const confirmBtn = screen.getByTestId('confirm-selection');
    fireEvent.click(confirmBtn);
    expect(await screen.findByTestId('selection-error')).toHaveTextContent(
      /selecione uma conta/i
    );
    expect(onConfirm).not.toHaveBeenCalled();

    // Select a valid account and confirm
    fireEvent.change(select, { target: { value: '2' } });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith('2');
    });
  });

  it('filters accounts with search input', () => {
    render(
      <AccountSelection
        initialAccounts={accounts}
        onCreateNewAccount={async () => ({ success: false, error: 'noop' })}
      />
    );

    const search = screen.getByTestId('account-search') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'Banco B' } });

    const select = screen.getByTestId('account-select');
    const options = within(select).getAllByRole('option');

    // Placeholder + 1 filtered option
    expect(options.length).toBe(2);
    expect(options[1]).toHaveTextContent('Banco B • Conta B (SAVINGS)');
  });

  it('validates selection using onValidateSelection and shows error on invalid', async () => {
    const onValidateSelection = vi
      .fn()
      .mockResolvedValue({ isValid: false, error: 'Conta inválida (teste)' });

    const onConfirm = vi.fn();

    render(
      <AccountSelection
        initialAccounts={accounts}
        onConfirm={onConfirm}
        onValidateSelection={onValidateSelection}
        onCreateNewAccount={async () => ({ success: false, error: 'noop' })}
      />
    );

    const select = screen.getByTestId('account-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '2' } });

    fireEvent.click(screen.getByTestId('confirm-selection'));

    expect(await screen.findByTestId('selection-error')).toHaveTextContent(
      /conta inválida/i
    );
    expect(onValidateSelection).toHaveBeenCalledWith('2');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('prefills defaultSelectedId when provided', () => {
    render(
      <AccountSelection
        initialAccounts={accounts}
        defaultSelectedId="3"
        onCreateNewAccount={async () => ({ success: false, error: 'noop' })}
      />
    );

    const select = screen.getByTestId('account-select') as HTMLSelectElement;
    expect(select.value).toBe('3');
  });

  it('toggles and submits "Create New Account" inline form successfully', async () => {
    const newAccount = makeAccount(
      '10',
      'Nova Conta',
      'Banco Z',
      'CHECKING',
      true
    );

    const onCreateNewAccount = vi.fn().mockResolvedValue({
      success: true,
      account: newAccount,
    });

    render(
      <AccountSelection
        initialAccounts={accounts}
        onCreateNewAccount={onCreateNewAccount}
      />
    );

    // Open create form
    const toggle = screen.getByTestId('toggle-create');
    fireEvent.click(toggle);
    expect(screen.getByTestId('create-form')).toBeInTheDocument();

    // Fill fields
    fireEvent.change(screen.getByTestId('create-name'), {
      target: { value: 'Nova Conta' },
    });
    fireEvent.change(screen.getByTestId('create-bank'), {
      target: { value: 'Banco Z' },
    });
    fireEvent.change(screen.getByTestId('create-type'), {
      target: { value: 'CHECKING' },
    });
    // leave active checked

    // Submit
    fireEvent.click(screen.getByTestId('create-submit'));

    await waitFor(() => {
      expect(onCreateNewAccount).toHaveBeenCalledTimes(1);
    });

    // After creation, form closes and the new account is selected in the dropdown
    await waitFor(() => {
      const select = screen.getByTestId('account-select') as HTMLSelectElement;
      expect(select.value).toBe('10');
    });
  });

  it('shows error when creating new account fails', async () => {
    const onCreateNewAccount = vi
      .fn()
      .mockResolvedValue({ success: false, error: 'Já existe uma conta' });

    render(
      <AccountSelection
        initialAccounts={accounts}
        onCreateNewAccount={onCreateNewAccount}
      />
    );

    // Open create form
    fireEvent.click(screen.getByTestId('toggle-create'));

    // Submit with missing fields to trigger client validation
    fireEvent.click(screen.getByTestId('create-submit'));
    expect(await screen.findByTestId('create-error')).toHaveTextContent(
      /nome e banco são obrigatórios/i
    );

    // Fill minimal valid data then submit to trigger server error
    fireEvent.change(screen.getByTestId('create-name'), {
      target: { value: 'Nova Conta' },
    });
    fireEvent.change(screen.getByTestId('create-bank'), {
      target: { value: 'Banco Z' },
    });
    fireEvent.change(screen.getByTestId('create-type'), {
      target: { value: 'CHECKING' },
    });

    fireEvent.click(screen.getByTestId('create-submit'));

    expect(await screen.findByTestId('create-error')).toHaveTextContent(
      /já existe uma conta/i
    );
  });
});
