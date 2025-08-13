import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

// @vitest-environment jsdom

// Mock the server actions
vi.mock('@/lib/actions/rule-management-actions', () => ({
  previewRuleAction: vi.fn(),
  getRuleStatsAction: vi.fn(),
}));

// Mock the hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import the component after mocking
import TestRuleDialog from '@/app/regras-categorizacao/components/TestRuleDialog';
import type { RuleWithRelations } from '@/lib/database/rule-management';

const mockRule: RuleWithRelations = {
  id: 'rule-1',
  name: 'Test Rule',
  description: 'Test rule description',
  isActive: true,
  priority: 5,
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  criteria: {
    date: { dayRange: { start: 1, end: 15 } },
    value: { min: 100, max: 500, operator: 'between' },
    description: { keywords: ['ALUGUEL'], operator: 'and' },
    accounts: ['acc-1'],
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: { id: 'cat-1', name: 'Receitas de Aluguel' },
  property: { id: 'prop-1', code: 'PROP-001' },
};

const mockTransactionMatches = [
  {
    id: 'tx-1',
    date: new Date('2025-01-15'),
    description: 'ALUGUEL CASA CENTRO',
    amount: -1200.50,
    bankAccountName: 'Conta Corrente Sicredi',
    currentCategoryName: 'Receitas de Aluguel',
    currentPropertyCode: 'PROP-001',
    matched: true,
    confidence: 0.95,
  },
  {
    id: 'tx-2',
    date: new Date('2025-01-10'),
    description: 'PAGAMENTO AGUA',
    amount: -85.30,
    bankAccountName: 'Conta Corrente PJBank',
    matched: false,
  },
  {
    id: 'tx-3',
    date: new Date('2025-01-05'),
    description: 'ALUGUEL APARTAMENTO',
    amount: 950.00,
    bankAccountName: 'Conta Corrente Sicredi',
    matched: true,
    confidence: 0.88,
  },
];

const mockRuleStats = {
  totalSuggestions: 45,
  appliedSuggestions: 38,
  pendingSuggestions: 7,
  successRate: 0.844,
};

describe('TestRuleDialog', () => {
  const mockPreviewRuleAction = vi.fn();
  const mockGetRuleStatsAction = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    require('@/lib/actions/rule-management-actions').previewRuleAction.mockImplementation(mockPreviewRuleAction);
    require('@/lib/actions/rule-management-actions').getRuleStatsAction.mockImplementation(mockGetRuleStatsAction);
    
    vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
      toast: mockToast,
    });

    mockPreviewRuleAction.mockResolvedValue({
      success: true,
      data: { matches: mockTransactionMatches },
    });

    mockGetRuleStatsAction.mockResolvedValue({
      success: true,
      data: mockRuleStats,
    });
  });

  const renderTestRuleDialog = (rule = mockRule) => {
    return render(
      <TestRuleDialog rule={rule}>
        <button>Test Rule</button>
      </TestRuleDialog>
    );
  };

  describe('Rendering', () => {
    it('renders trigger button', () => {
      renderTestRuleDialog();

      expect(screen.getByRole('button', { name: 'Test Rule' })).toBeInTheDocument();
    });

    it('does not show dialog content initially', () => {
      renderTestRuleDialog();

      expect(screen.queryByText('Testar Regra: Test Rule')).not.toBeInTheDocument();
    });

    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Testar Regra: Test Rule')).toBeInTheDocument();
      });
    });

    it('shows dialog description', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Visualize quais transações seriam afetadas por esta regra e seu desempenho histórico.')).toBeInTheDocument();
      });
    });
  });

  describe('Rule Summary Section', () => {
    const openDialog = async () => {
      const user = userEvent.setup();
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Testar Regra: Test Rule')).toBeInTheDocument();
      });
    };

    it('displays rule name and status', async () => {
      renderTestRuleDialog();
      await openDialog();

      expect(screen.getByText('Test Rule')).toBeInTheDocument();
      
      // Active rule should show green indicator
      const statusIndicator = document.querySelector('.bg-green-500');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('displays rule priority', async () => {
      renderTestRuleDialog();
      await openDialog();

      expect(screen.getByText('Prioridade: 5')).toBeInTheDocument();
    });

    it('displays category information', async () => {
      renderTestRuleDialog();
      await openDialog();

      expect(screen.getByText(/Categoria:/)).toBeInTheDocument();
      expect(screen.getByText('Receitas de Aluguel')).toBeInTheDocument();
    });

    it('displays property information when available', async () => {
      renderTestRuleDialog();
      await openDialog();

      expect(screen.getByText(/Propriedade:/)).toBeInTheDocument();
      expect(screen.getByText('PROP-001')).toBeInTheDocument();
    });

    it('displays criteria icons', async () => {
      renderTestRuleDialog();
      await openDialog();

      // Should display icons for date, value, description, and accounts criteria
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(4); // At least the criteria icons plus others
    });

    it('handles rule without property', async () => {
      const ruleWithoutProperty = {
        ...mockRule,
        propertyId: null,
        property: null,
      };

      renderTestRuleDialog(ruleWithoutProperty);
      await openDialog();

      expect(screen.queryByText(/Propriedade:/)).not.toBeInTheDocument();
    });

    it('shows inactive rule status', async () => {
      const inactiveRule = {
        ...mockRule,
        isActive: false,
      };

      renderTestRuleDialog(inactiveRule);
      await openDialog();

      const statusIndicator = document.querySelector('.bg-red-500');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('Performance Stats Section', () => {
    const openDialog = async () => {
      const user = userEvent.setup();
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Desempenho Histórico')).toBeInTheDocument();
      });
    };

    it('displays performance statistics', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText('45')).toBeInTheDocument(); // Total suggestions
        expect(screen.getByText('38')).toBeInTheDocument(); // Applied suggestions
        expect(screen.getByText('7')).toBeInTheDocument();  // Pending suggestions
        expect(screen.getByText('84%')).toBeInTheDocument(); // Success rate
      });
    });

    it('displays correct stat labels', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText('Sugestões geradas')).toBeInTheDocument();
        expect(screen.getByText('Aplicadas')).toBeInTheDocument();
        expect(screen.getByText('Pendentes')).toBeInTheDocument();
        expect(screen.getByText('Taxa de sucesso')).toBeInTheDocument();
      });
    });

    it('handles stats loading failure gracefully', async () => {
      mockGetRuleStatsAction.mockResolvedValue({
        success: false,
        error: 'Stats unavailable',
      });

      renderTestRuleDialog();
      await openDialog();

      // Stats section should not be displayed
      expect(screen.queryByText('Desempenho Histórico')).not.toBeInTheDocument();
    });
  });

  describe('Transaction Testing', () => {
    const openDialog = async () => {
      const user = userEvent.setup();
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Transações de Teste')).toBeInTheDocument();
      });
    };

    it('shows loading state initially', async () => {
      // Make the preview action take longer
      mockPreviewRuleAction.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          success: true,
          data: { matches: mockTransactionMatches },
        }), 100);
      }));

      renderTestRuleDialog();
      await openDialog();

      expect(screen.getByText('Testando regra...')).toBeInTheDocument();
      
      const loadingSpinner = document.querySelector('.animate-spin');
      expect(loadingSpinner).toBeInTheDocument();
    });

    it('displays transaction matches after loading', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText('ALUGUEL CASA CENTRO')).toBeInTheDocument();
        expect(screen.getByText('PAGAMENTO AGUA')).toBeInTheDocument();
        expect(screen.getByText('ALUGUEL APARTAMENTO')).toBeInTheDocument();
      });
    });

    it('displays transaction details correctly', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        // Check formatted currency
        expect(screen.getByText('R$ -1.200,50')).toBeInTheDocument();
        expect(screen.getByText('R$ -85,30')).toBeInTheDocument();
        expect(screen.getByText('R$ 950,00')).toBeInTheDocument();

        // Check bank account names
        expect(screen.getByText('Conta Corrente Sicredi')).toBeInTheDocument();
        expect(screen.getByText('Conta Corrente PJBank')).toBeInTheDocument();

        // Check dates (formatted as dd/MM/yyyy)
        expect(screen.getByText('15/01/2025')).toBeInTheDocument();
        expect(screen.getByText('10/01/2025')).toBeInTheDocument();
        expect(screen.getByText('05/01/2025')).toBeInTheDocument();
      });
    });

    it('displays match status indicators', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        // Should have check and X icons for matched/unmatched
        const icons = document.querySelectorAll('svg');
        const checkIcons = Array.from(icons).filter(icon => 
          icon.classList.contains('text-green-600')
        );
        const xIcons = Array.from(icons).filter(icon => 
          icon.classList.contains('text-red-600')
        );

        expect(checkIcons.length).toBeGreaterThan(0);
        expect(xIcons.length).toBeGreaterThan(0);
      });
    });

    it('displays confidence badges for matched transactions', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText('95%')).toBeInTheDocument();
        expect(screen.getByText('88%')).toBeInTheDocument();
      });
    });

    it('shows current category and property information', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText(/Categoria atual: Receitas de Aluguel/)).toBeInTheDocument();
        expect(screen.getByText(/Propriedade: PROP-001/)).toBeInTheDocument();
      });
    });

    it('applies correct styling for matched/unmatched transactions', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        const transactionCards = document.querySelectorAll('[class*="p-3 rounded-lg border"]');
        expect(transactionCards.length).toBeGreaterThan(0);

        // Check for green background on matched transactions
        const matchedCards = document.querySelectorAll('.bg-green-50');
        expect(matchedCards.length).toBeGreaterThan(0);

        // Check for gray background on unmatched transactions
        const unmatchedCards = document.querySelectorAll('.bg-gray-50');
        expect(unmatchedCards.length).toBeGreaterThan(0);
      });
    });

    it('shows positive amounts in green and negative in red', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        // Negative amounts should be red
        const negativeAmounts = document.querySelectorAll('.text-red-600');
        expect(negativeAmounts.length).toBeGreaterThan(0);

        // Positive amounts should be green
        const positiveAmounts = document.querySelectorAll('.text-green-600');
        expect(positiveAmounts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Empty State', () => {
    it('shows no transactions message when no matches found', async () => {
      mockPreviewRuleAction.mockResolvedValue({
        success: true,
        data: { matches: [] },
      });

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument();
        expect(screen.getByText(/Esta regra não encontrou transações correspondentes/)).toBeInTheDocument();
      });
    });

    it('shows empty state icon', async () => {
      mockPreviewRuleAction.mockResolvedValue({
        success: true,
        data: { matches: [] },
      });

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        const alertIcon = document.querySelector('.text-muted-foreground.mb-4');
        expect(alertIcon).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast when preview fails', async () => {
      mockPreviewRuleAction.mockResolvedValue({
        success: false,
        error: 'Preview failed',
      });

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro no teste',
          description: 'Preview failed',
          variant: 'destructive',
        });
      });
    });

    it('shows generic error toast when exception occurs', async () => {
      mockPreviewRuleAction.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Ocorreu um erro inesperado ao testar a regra.',
          variant: 'destructive',
        });
      });
    });

    it('handles missing error message gracefully', async () => {
      mockPreviewRuleAction.mockResolvedValue({
        success: false,
      });

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro no teste',
          description: 'Falha ao testar regra.',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Retry Functionality', () => {
    const openDialog = async () => {
      const user = userEvent.setup();
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Transações de Teste')).toBeInTheDocument();
      });
    };

    it('shows retry button', async () => {
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(screen.getByText('Testar Novamente')).toBeInTheDocument();
      });
    });

    it('calls test function when retry button is clicked', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();
      await openDialog();

      await waitFor(() => {
        expect(mockPreviewRuleAction).toHaveBeenCalledTimes(1);
      });

      const retryButton = screen.getByText('Testar Novamente');
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockPreviewRuleAction).toHaveBeenCalledTimes(2);
      });
    });

    it('disables retry button while loading', async () => {
      // Make the action take longer
      mockPreviewRuleAction.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          success: true,
          data: { matches: mockTransactionMatches },
        }), 100);
      }));

      const user = userEvent.setup();
      renderTestRuleDialog();
      await openDialog();

      const retryButton = screen.getByText('Testar Novamente');
      await user.click(retryButton);

      expect(retryButton).toBeDisabled();
    });
  });

  describe('Limit Handling', () => {
    it('shows limit message when at transaction limit', async () => {
      const manyTransactions = Array.from({ length: 50 }, (_, i) => ({
        ...mockTransactionMatches[0],
        id: `tx-${i}`,
      }));

      mockPreviewRuleAction.mockResolvedValue({
        success: true,
        data: { matches: manyTransactions },
      });

      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText(/Mostrando primeiras 50 transações/)).toBeInTheDocument();
      });
    });

    it('does not show limit message when under limit', async () => {
      renderTestRuleDialog();
      
      const user = userEvent.setup();
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.queryByText(/Mostrando primeiras 50 transações/)).not.toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('calls preview action with correct parameters', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockPreviewRuleAction).toHaveBeenCalledWith({
          criteria: mockRule.criteria,
          categoryId: mockRule.categoryId,
          propertyId: mockRule.propertyId,
          limit: 50,
        });
      });
    });

    it('calls stats action with correct parameters', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockGetRuleStatsAction).toHaveBeenCalledWith(mockRule.id);
      });
    });

    it('makes both API calls in parallel', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockPreviewRuleAction).toHaveBeenCalledTimes(1);
        expect(mockGetRuleStatsAction).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Dialog State Management', () => {
    it('only loads data when dialog is opened', () => {
      renderTestRuleDialog();

      // Data should not be loaded until dialog is opened
      expect(mockPreviewRuleAction).not.toHaveBeenCalled();
      expect(mockGetRuleStatsAction).not.toHaveBeenCalled();
    });

    it('does not reload data when dialog is reopened with existing data', async () => {
      const user = userEvent.setup();
      renderTestRuleDialog();

      // Open dialog first time
      const triggerButton = screen.getByRole('button', { name: 'Test Rule' });
      await user.click(triggerButton);

      await waitFor(() => {
        expect(mockPreviewRuleAction).toHaveBeenCalledTimes(1);
      });

      // Close dialog (simulate ESC key)
      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Testar Regra: Test Rule')).not.toBeInTheDocument();
      });

      // Reopen dialog
      await user.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Testar Regra: Test Rule')).toBeInTheDocument();
      });

      // Should not have made additional API calls
      expect(mockPreviewRuleAction).toHaveBeenCalledTimes(1);
    });
  });
});