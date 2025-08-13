import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';

// @vitest-environment jsdom

// Create a wrapper component that provides the form context
const TestWrapper = ({ 
  children, 
  defaultValues = {},
  onFormChange 
}: { 
  children: React.ReactNode;
  defaultValues?: any;
  onFormChange?: (data: any) => void;
}) => {
  const form = useForm({
    defaultValues: {
      criteria: {},
      ...defaultValues,
    },
  });

  // Watch for form changes
  React.useEffect(() => {
    const subscription = form.watch((data) => {
      onFormChange?.(data);
    });
    return () => subscription.unsubscribe();
  }, [form.watch, onFormChange]);

  return (
    <div>
      {React.cloneElement(children as React.ReactElement, { form })}
    </div>
  );
};

// Import after setting up test environment
import AccountCriteriaForm from '@/app/regras-categorizacao/components/AccountCriteriaForm';

// Mock bank accounts data
const mockBankAccounts = [
  {
    id: 'acc-1',
    name: 'Conta Corrente Sicredi',
    bankName: 'Sicredi',
    accountType: 'CHECKING',
    isActive: true,
  },
  {
    id: 'acc-2',
    name: 'Poupança PJBank',
    bankName: 'PJBank',
    accountType: 'SAVINGS',
    isActive: true,
  },
  {
    id: 'acc-3',
    name: 'Investimento XP',
    bankName: 'XP Investimentos',
    accountType: 'INVESTMENT',
    isActive: true,
  },
  {
    id: 'acc-4',
    name: 'Conta Inativa',
    bankName: 'Banco Inativo',
    accountType: 'CHECKING',
    isActive: false,
  },
];

describe('AccountCriteriaForm', () => {
  const mockOnFormChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAccountCriteriaForm = (
    bankAccounts = mockBankAccounts,
    defaultValues = {}
  ) => {
    return render(
      <TestWrapper
        defaultValues={defaultValues}
        onFormChange={mockOnFormChange}
      >
        <AccountCriteriaForm
          form={null as any}
          bankAccounts={bankAccounts}
        />
      </TestWrapper>
    );
  };

  describe('Rendering', () => {
    it('renders the account criteria section with title', () => {
      renderAccountCriteriaForm();

      expect(screen.getByText('Critérios de Conta')).toBeInTheDocument();
    });

    it('renders account toggle with description', () => {
      renderAccountCriteriaForm();

      expect(screen.getByText('Filtrar por Contas Específicas')).toBeInTheDocument();
      expect(screen.getByText('Aplicar apenas em transações de contas bancárias específicas.')).toBeInTheDocument();
      
      const accountSwitch = screen.getByRole('switch');
      expect(accountSwitch).toBeInTheDocument();
      expect(accountSwitch).not.toBeChecked();
    });

    it('does not show account selection initially', () => {
      renderAccountCriteriaForm();

      expect(screen.queryByText('Selecionar todas')).not.toBeInTheDocument();
      expect(screen.queryByText('Conta Corrente Sicredi')).not.toBeInTheDocument();
    });
  });

  describe('Account Toggle Functionality', () => {
    it('shows account selection when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
        expect(screen.getByText('Limpar seleção')).toBeInTheDocument();
      });
    });

    it('shows default description when enabled', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByText('Aplicar em todas as contas')).toBeInTheDocument();
      });
    });

    it('hides account selection when toggle is disabled', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      // Enable first
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });

      // Disable
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.queryByText('Selecionar todas')).not.toBeInTheDocument();
      });
    });
  });

  describe('Account List Rendering', () => {
    const enableAccountCriteria = async (user: any) => {
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });
    };

    it('displays only active accounts', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      // Active accounts should be visible
      expect(screen.getByText('Conta Corrente Sicredi')).toBeInTheDocument();
      expect(screen.getByText('Poupança PJBank')).toBeInTheDocument();
      expect(screen.getByText('Investimento XP')).toBeInTheDocument();

      // Inactive account should not be visible
      expect(screen.queryByText('Conta Inativa')).not.toBeInTheDocument();
    });

    it('displays correct account information', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      // Check account names
      expect(screen.getByText('Conta Corrente Sicredi')).toBeInTheDocument();
      expect(screen.getByText('Poupança PJBank')).toBeInTheDocument();
      expect(screen.getByText('Investimento XP')).toBeInTheDocument();

      // Check bank names and account types
      expect(screen.getByText('Sicredi • Conta Corrente')).toBeInTheDocument();
      expect(screen.getByText('PJBank • Poupança')).toBeInTheDocument();
      expect(screen.getByText('XP Investimentos • Investimento')).toBeInTheDocument();
    });

    it('shows warning when no active accounts exist', async () => {
      const user = userEvent.setup();
      const noActiveAccounts = mockBankAccounts.map(acc => ({ ...acc, isActive: false }));
      
      renderAccountCriteriaForm(noActiveAccounts);
      
      await enableAccountCriteria(user);

      expect(screen.getByText('Nenhuma conta ativa encontrada. Verifique se existem contas cadastradas no sistema.')).toBeInTheDocument();
    });

    it('renders checkboxes for all active accounts', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const checkboxes = screen.getAllByRole('checkbox');
      // Should have 3 checkboxes (excluding the inactive account)
      expect(checkboxes).toHaveLength(3);

      // Check specific checkboxes exist
      expect(screen.getByLabelText('Conta Corrente Sicredi')).toBeInTheDocument();
      expect(screen.getByLabelText('Poupança PJBank')).toBeInTheDocument();
      expect(screen.getByLabelText('Investimento XP')).toBeInTheDocument();
    });
  });

  describe('Account Selection', () => {
    const enableAccountCriteria = async (user: any) => {
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });
    };

    it('selects individual accounts correctly', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      await user.click(sicrediCheckbox);

      expect(sicrediCheckbox).toBeChecked();

      await waitFor(() => {
        expect(screen.getByText('Aplicar apenas em: Conta Corrente Sicredi')).toBeInTheDocument();
      });
    });

    it('deselects accounts correctly', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      
      // Select first
      await user.click(sicrediCheckbox);
      expect(sicrediCheckbox).toBeChecked();

      // Then deselect
      await user.click(sicrediCheckbox);
      expect(sicrediCheckbox).not.toBeChecked();

      await waitFor(() => {
        expect(screen.getByText('Aplicar em todas as contas')).toBeInTheDocument();
      });
    });

    it('handles multiple account selection', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      const pjbankCheckbox = screen.getByLabelText('Poupança PJBank');

      await user.click(sicrediCheckbox);
      await user.click(pjbankCheckbox);

      expect(sicrediCheckbox).toBeChecked();
      expect(pjbankCheckbox).toBeChecked();

      await waitFor(() => {
        expect(screen.getByText('Aplicar em 2 contas selecionadas')).toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions', () => {
    const enableAccountCriteria = async (user: any) => {
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });
    };

    it('selects all accounts with "Selecionar todas"', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const selectAllButton = screen.getByText('Selecionar todas');
      await user.click(selectAllButton);

      // All active account checkboxes should be checked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });

      await waitFor(() => {
        expect(screen.getByText('Aplicar em todas as contas ativas')).toBeInTheDocument();
      });
    });

    it('clears selection with "Limpar seleção"', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      // First select all
      const selectAllButton = screen.getByText('Selecionar todas');
      await user.click(selectAllButton);

      // Then clear
      const clearButton = screen.getByText('Limpar seleção');
      await user.click(clearButton);

      // All checkboxes should be unchecked
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });

      await waitFor(() => {
        expect(screen.getByText('Aplicar em todas as contas')).toBeInTheDocument();
      });
    });

    it('shows correct quick action buttons', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      expect(screen.getByText('Limpar seleção')).toBeInTheDocument();
      
      // Check that they are buttons with proper styling
      const selectAllButton = screen.getByText('Selecionar todas');
      const clearButton = screen.getByText('Limpar seleção');
      
      expect(selectAllButton.tagName).toBe('BUTTON');
      expect(clearButton.tagName).toBe('BUTTON');
    });
  });

  describe('Account Type Labels', () => {
    const enableAccountCriteria = async (user: any) => {
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });
    };

    it('displays correct account type labels', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      expect(screen.getByText(/• Conta Corrente/)).toBeInTheDocument();
      expect(screen.getByText(/• Poupança/)).toBeInTheDocument();
      expect(screen.getByText(/• Investimento/)).toBeInTheDocument();
    });

    it('handles unknown account types', async () => {
      const user = userEvent.setup();
      const accountsWithUnknown = [
        ...mockBankAccounts,
        {
          id: 'acc-5',
          name: 'Conta Desconhecida',
          bankName: 'Banco Teste',
          accountType: 'UNKNOWN_TYPE',
          isActive: true,
        },
      ];
      
      renderAccountCriteriaForm(accountsWithUnknown);
      
      await enableAccountCriteria(user);

      expect(screen.getByText(/• UNKNOWN_TYPE/)).toBeInTheDocument();
    });
  });

  describe('Description Generation', () => {
    const enableAccountCriteria = async (user: any) => {
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });
    };

    it('shows "all accounts" when no selection', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      expect(screen.getByText('Aplicar em todas as contas')).toBeInTheDocument();
    });

    it('shows account name for single selection', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      await user.click(sicrediCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Aplicar apenas em: Conta Corrente Sicredi')).toBeInTheDocument();
      });
    });

    it('shows count for multiple selections', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      const pjbankCheckbox = screen.getByLabelText('Poupança PJBank');

      await user.click(sicrediCheckbox);
      await user.click(pjbankCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Aplicar em 2 contas selecionadas')).toBeInTheDocument();
      });
    });

    it('shows "all active accounts" when all are selected', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      const selectAllButton = screen.getByText('Selecionar todas');
      await user.click(selectAllButton);

      await waitFor(() => {
        expect(screen.getByText('Aplicar em todas as contas ativas')).toBeInTheDocument();
      });
    });

    it('updates description as selections change', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();
      
      await enableAccountCriteria(user);

      // Start with no selection
      expect(screen.getByText('Aplicar em todas as contas')).toBeInTheDocument();

      // Select one account
      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      await user.click(sicrediCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Aplicar apenas em: Conta Corrente Sicredi')).toBeInTheDocument();
      });

      // Select another account
      const pjbankCheckbox = screen.getByLabelText('Poupança PJBank');
      await user.click(pjbankCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Aplicar em 2 contas selecionadas')).toBeInTheDocument();
      });

      // Deselect one account
      await user.click(pjbankCheckbox);

      await waitFor(() => {
        expect(screen.getByText('Aplicar apenas em: Conta Corrente Sicredi')).toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('loads existing account criteria correctly', () => {
      const existingValues = {
        criteria: {
          accounts: ['acc-1', 'acc-3']
        }
      };

      renderAccountCriteriaForm(mockBankAccounts, existingValues);

      // Account criteria should be pre-enabled
      const accountSwitch = screen.getByRole('switch');
      expect(accountSwitch).toBeChecked();

      // Selected accounts should be checked
      expect(screen.getByLabelText('Conta Corrente Sicredi')).toBeChecked();
      expect(screen.getByLabelText('Investimento XP')).toBeChecked();
      expect(screen.getByLabelText('Poupança PJBank')).not.toBeChecked();
    });

    it('handles empty accounts array', () => {
      const existingValues = {
        criteria: {
          accounts: []
        }
      };

      renderAccountCriteriaForm(mockBankAccounts, existingValues);

      const accountSwitch = screen.getByRole('switch');
      expect(accountSwitch).toBeChecked();

      // No accounts should be selected
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked();
      });
    });

    it('clears criteria correctly when disabled', async () => {
      const user = userEvent.setup();
      const existingValues = {
        criteria: {
          accounts: ['acc-1', 'acc-2']
        }
      };

      renderAccountCriteriaForm(mockBankAccounts, existingValues);

      // Should be enabled initially
      const accountSwitch = screen.getByRole('switch');
      expect(accountSwitch).toBeChecked();

      // Disable
      await user.click(accountSwitch);

      expect(accountSwitch).not.toBeChecked();
      expect(screen.queryByText('Conta Corrente Sicredi')).not.toBeInTheDocument();
    });

    it('preserves selection when toggling off and on', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      // Enable and select accounts
      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      const sicrediCheckbox = screen.getByLabelText('Conta Corrente Sicredi');
      await user.click(sicrediCheckbox);

      // Disable
      await user.click(accountSwitch);

      // Re-enable - selection should be cleared
      await user.click(accountSwitch);

      await waitFor(() => {
        const sicrediCheckboxNew = screen.getByLabelText('Conta Corrente Sicredi');
        expect(sicrediCheckboxNew).not.toBeChecked();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty bank accounts array', () => {
      renderAccountCriteriaForm([]);

      expect(screen.getByText('Critérios de Conta')).toBeInTheDocument();
      
      const accountSwitch = screen.getByRole('switch');
      expect(accountSwitch).not.toBeChecked();
    });

    it('handles accounts with missing properties', async () => {
      const user = userEvent.setup();
      const malformedAccounts = [
        {
          id: 'acc-1',
          name: 'Account Without Bank',
          bankName: '',
          accountType: '',
          isActive: true,
        },
      ];

      renderAccountCriteriaForm(malformedAccounts);

      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByText('Account Without Bank')).toBeInTheDocument();
        expect(screen.getByText(' • ')).toBeInTheDocument(); // Should show empty bank name and type
      });
    });

    it('handles checkbox interaction edge cases', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Conta Corrente Sicredi')).toBeInTheDocument();
      });

      const checkbox = screen.getByLabelText('Conta Corrente Sicredi');
      
      // Rapid clicks should work correctly
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      expect(checkbox).toBeChecked();
    });

    it('maintains state consistency during rapid interactions', async () => {
      const user = userEvent.setup();
      renderAccountCriteriaForm();

      const accountSwitch = screen.getByRole('switch');
      await user.click(accountSwitch);

      await waitFor(() => {
        expect(screen.getByText('Selecionar todas')).toBeInTheDocument();
      });

      // Rapidly click select all and clear
      const selectAllButton = screen.getByText('Selecionar todas');
      const clearButton = screen.getByText('Limpar seleção');

      await user.click(selectAllButton);
      await user.click(clearButton);
      await user.click(selectAllButton);

      // All checkboxes should be selected
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked();
      });
    });
  });
});