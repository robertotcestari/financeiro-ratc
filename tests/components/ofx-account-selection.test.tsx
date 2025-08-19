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
import { AccountSelection } from '@/components/features/ofx/AccountSelection';

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
    makeAccount('3', 'Conta B', 'Banco B', 'SAVINGS', true),
    makeAccount('1', 'Conta A Inativa', 'Banco A', 'CHECKING', false),
    makeAccount('2', 'Conta A', 'Banco A', 'CHECKING', true),
    makeAccount('4', 'Conta C', 'Banco A', 'INVESTMENT', true),
  ];

  it('renders combobox and confirms selection', async () => {
    const onConfirm = vi.fn();
    render(
      <AccountSelection
        initialAccounts={accounts}
        onConfirm={onConfirm}
      />
    );

    // Combobox trigger button present
    const trigger = screen.getByTestId('account-select');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveRole('combobox');
    
    // Should show placeholder initially
    expect(trigger).toHaveTextContent('Selecione uma conta...');

    const confirmBtn = screen.getByTestId('confirm-selection');
    
    // Initially button should be disabled when no selection
    expect(confirmBtn).toBeDisabled();

    // Open the combobox
    fireEvent.click(trigger);
    
    // Wait for the popover to appear and select an account
    // Note: Only active accounts are shown
    const option = await screen.findByText('Banco A • Conta A (CHECKING)');
    fireEvent.click(option);

    // Verify the selection was made
    await waitFor(() => {
      expect(trigger).toHaveTextContent('Banco A • Conta A (CHECKING)');
    });
    
    // Button should now be enabled
    expect(confirmBtn).not.toBeDisabled();

    // Confirm the selection
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith('2');
    });
  });

  it('filters accounts with search in combobox', async () => {
    render(
      <AccountSelection
        initialAccounts={accounts}
      />
    );

    const trigger = screen.getByTestId('account-select');
    
    // Open the combobox
    fireEvent.click(trigger);
    
    // Initially all active accounts should be visible
    expect(await screen.findByText('Banco A • Conta A (CHECKING)')).toBeInTheDocument();
    expect(screen.queryByText('Banco A • Conta C (INVESTMENT)')).toBeInTheDocument();
    expect(screen.queryByText('Banco B • Conta B (SAVINGS)')).toBeInTheDocument();
    
    // Find the search input inside the popover and search for "SAVINGS"
    const searchInput = screen.getByPlaceholderText('Buscar conta...');
    fireEvent.change(searchInput, { target: { value: 'SAVINGS' } });

    // Wait for filtering to take effect
    await waitFor(() => {
      // Should show only the SAVINGS account
      expect(screen.queryByText('Banco B • Conta B (SAVINGS)')).toBeInTheDocument();
      // These should be filtered out
      expect(screen.queryByText('Banco A • Conta A (CHECKING)')).not.toBeInTheDocument();
      expect(screen.queryByText('Banco A • Conta C (INVESTMENT)')).not.toBeInTheDocument();
    });
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
      />
    );

    const trigger = screen.getByTestId('account-select');
    
    // Open combobox and select an account
    fireEvent.click(trigger);
    const option = await screen.findByText('Banco A • Conta A (CHECKING)');
    fireEvent.click(option);

    // Try to confirm
    fireEvent.click(screen.getByTestId('confirm-selection'));

    expect(await screen.findByTestId('selection-error')).toHaveTextContent(
      /conta inválida/i
    );
    expect(onValidateSelection).toHaveBeenCalledWith('2');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('prefills defaultSelectedId when provided', async () => {
    render(
      <AccountSelection
        initialAccounts={accounts}
        defaultSelectedId="3"
      />
    );

    const trigger = screen.getByTestId('account-select');
    
    // Should show the pre-selected account
    await waitFor(() => {
      expect(trigger).toHaveTextContent('Banco B • Conta B (SAVINGS)');
    });
  });
});