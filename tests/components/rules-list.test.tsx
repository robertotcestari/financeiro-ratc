import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

// @vitest-environment jsdom

// Mock the server actions
vi.mock('@/lib/actions/rule-management-actions', () => ({
  deleteRuleAction: vi.fn(),
  toggleRuleStatusAction: vi.fn(),
}));

// Create a mock toast function
const mockToast = vi.fn();

// Mock the hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => 'há 2 dias'),
}));

vi.mock('date-fns/locale', () => ({
  ptBR: {},
}));

// Mock the dialog components
vi.mock('@/app/(protected)/regras-categorizacao/components/EditRuleDialog', () => ({
  default: ({ children, onRuleUpdated }: any) => (
    <div data-testid="edit-rule-dialog">
      {children}
      <button onClick={() => onRuleUpdated({ id: '1', name: 'Updated Rule' })}>
        Update Rule
      </button>
    </div>
  ),
}));

vi.mock('@/app/(protected)/regras-categorizacao/components/TestRuleDialog', () => ({
  default: ({ children }: any) => (
    <div data-testid="test-rule-dialog">
      {children}
    </div>
  ),
}));

// Import the component after mocking
import RulesList from '@/app/(protected)/regras-categorizacao/components/RulesList';
import type { RuleWithRelations } from '@/lib/core/database/rule-management';
import type { FormData } from '@/app/(protected)/regras-categorizacao/components/CreateRuleDialog';

const mockFormData: FormData = {
  categories: [
    { id: 'cat-1', name: 'Receitas', level: 1 },
    { id: 'cat-2', name: 'Despesas', level: 1 },
  ],
  properties: [
    { id: 'prop-1', code: 'TEST-001', description: 'Test Property' },
  ],
  bankAccounts: [
    { id: 'acc-1', name: 'Test Account', bank: 'Test Bank' },
  ],
};

const mockRule: RuleWithRelations = {
  id: '1',
  name: 'Test Rule',
  description: 'Test rule description',
  isActive: true,
  priority: 5,
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  criteria: {
    date: { dayRange: { start: 1, end: 15 } },
    value: { min: 100, max: 500, operator: 'between' },
    description: { keywords: ['TEST'], operator: 'and' },
    accounts: ['acc-1'],
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: { id: 'cat-1', name: 'Receitas' },
  property: { id: 'prop-1', code: 'TEST-001' },
};

describe('RulesList', () => {
  let mockToggleRuleStatusAction: any;
  let mockDeleteRuleAction: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked functions
    const actions = await import('@/lib/actions/rule-management-actions');
    mockToggleRuleStatusAction = vi.mocked(actions.toggleRuleStatusAction);
    mockDeleteRuleAction = vi.mocked(actions.deleteRuleAction);
    
    // Reset default mock behaviors
    mockToggleRuleStatusAction.mockResolvedValue({ success: true });
    mockDeleteRuleAction.mockResolvedValue({ success: true });
    mockToast.mockClear();
  });

  const renderRulesList = (rules: RuleWithRelations[] = [mockRule]) => {
    const initialData = {
      rules,
      total: rules.length,
    };

    return render(
      <RulesList
        initialData={initialData}
        formData={mockFormData}
      />
    );
  };

  describe('Rendering', () => {
    it('renders empty state when no rules exist', () => {
      renderRulesList([]);

      expect(screen.getByText('Nenhuma regra criada')).toBeInTheDocument();
      expect(screen.getByText('Crie sua primeira regra para automatizar a categorização de transações.')).toBeInTheDocument();
    });

    it('renders rule card with correct information', () => {
      renderRulesList();

      // Check rule name and description
      expect(screen.getByText('Test Rule')).toBeInTheDocument();
      expect(screen.getByText('Test rule description')).toBeInTheDocument();

      // Check status indicator (active rule should have green indicator)
      const statusIndicator = document.querySelector('.bg-green-500');
      expect(statusIndicator).toBeInTheDocument();

      // Check category and property badges
      expect(screen.getByText('Categoria: Receitas')).toBeInTheDocument();
      expect(screen.getByText('Propriedade: TEST-001')).toBeInTheDocument();

      // Check priority
      expect(screen.getByText('Prioridade: 5')).toBeInTheDocument();

      // Check creation date
      expect(screen.getByText(/Criada há 2 dias/)).toBeInTheDocument();
    });

    it('renders inactive rule with correct styling', () => {
      const inactiveRule = { ...mockRule, isActive: false };
      renderRulesList([inactiveRule]);

      const card = document.querySelector('.opacity-60');
      expect(card).toBeInTheDocument();

      const statusIndicator = document.querySelector('.bg-red-500');
      expect(statusIndicator).toBeInTheDocument();
    });

    it('formats criteria correctly', () => {
      renderRulesList();

      // Check formatted criteria display
      expect(screen.getByText(/Dia 1-15/)).toBeInTheDocument();
      expect(screen.getByText(/Valor: R\$ 100 - R\$ 500/)).toBeInTheDocument();
      expect(screen.getByText(/Palavras: "TEST"/)).toBeInTheDocument();
      expect(screen.getByText(/1 conta\(s\)/)).toBeInTheDocument();
    });

    it('displays criteria icons', () => {
      renderRulesList();

      // Check for presence of criteria icons (lucide icons are rendered as SVGs)
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders switch in correct state', () => {
      renderRulesList();

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeChecked();
    });
  });

  describe('Rule Status Toggle', () => {
    it('toggles rule status when switch is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeChecked(); // Should start checked since rule.isActive is true
      
      await user.click(switchElement);

      await waitFor(() => {
        expect(mockToggleRuleStatusAction).toHaveBeenCalledWith('1', false);
      });
    });

    it('updates UI when status toggle succeeds', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeChecked(); // Initially active
      
      await user.click(switchElement);

      await waitFor(() => {
        expect(mockToggleRuleStatusAction).toHaveBeenCalledWith('1', false);
      });
      
      // Wait for component state update
      await waitFor(() => {
        // After successful toggle, the rule should be inactive
        const updatedSwitchElement = screen.getByRole('switch');
        expect(updatedSwitchElement).not.toBeChecked();
      });
    });

    it('shows error toast when status toggle fails', async () => {
      mockToggleRuleStatusAction.mockResolvedValue({
        success: false,
        error: 'Toggle failed',
      });

      const user = userEvent.setup();
      renderRulesList();

      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Toggle failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Rule Actions Menu', () => {
    it('shows actions menu when more button is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' }); // MoreHorizontal icon button
      await user.click(moreButton);

      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Testar')).toBeInTheDocument();
      expect(screen.getByText('Excluir')).toBeInTheDocument();
    });

    it('opens edit dialog when edit is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const editButton = screen.getByText('Editar');
      await user.click(editButton);

      expect(screen.getByTestId('edit-rule-dialog')).toBeInTheDocument();
    });

    it('opens test dialog when test is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const testButton = screen.getByText('Testar');
      await user.click(testButton);

      expect(screen.getByTestId('test-rule-dialog')).toBeInTheDocument();
    });

    it('updates rule in list when edit is successful', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const editButton = screen.getByText('Editar');
      await user.click(editButton);

      const updateButton = screen.getByText('Update Rule');
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Updated Rule')).toBeInTheDocument();
      });
    });
  });

  describe('Rule Deletion', () => {
    it('shows delete confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
      expect(screen.getByText(/Tem certeza que deseja excluir a regra "Test Rule"/)).toBeInTheDocument();
    });

    it('cancels deletion when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      const cancelButton = screen.getByText('Cancelar');
      await user.click(cancelButton);

      // Dialog should be closed
      expect(screen.queryByText('Confirmar Exclusão')).not.toBeInTheDocument();
    });

    it('deletes rule when confirmed', async () => {
      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      const confirmButton = screen.getByText('Excluir');
      await user.click(confirmButton);

      expect(mockDeleteRuleAction).toHaveBeenCalledWith('1');

      await waitFor(() => {
        // Rule should be removed from the list
        expect(screen.queryByText('Test Rule')).not.toBeInTheDocument();
      });
    });

    it('shows error when deletion fails', async () => {
      mockDeleteRuleAction.mockResolvedValue({
        success: false,
        error: 'Delete failed',
      });

      const user = userEvent.setup();
      renderRulesList();

      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      const confirmButton = screen.getByText('Excluir');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro',
          description: 'Delete failed',
          variant: 'destructive',
        });
      });
    });
  });

  describe('Complex Criteria Formatting', () => {
    it('formats single day range correctly', () => {
      const ruleWithSingleDay = {
        ...mockRule,
        criteria: {
          date: { dayRange: { start: 15, end: 15 } },
        },
      };
      renderRulesList([ruleWithSingleDay]);

      expect(screen.getByText(/Dia 15/)).toBeInTheDocument();
    });

    it('formats months correctly', () => {
      const ruleWithMonths = {
        ...mockRule,
        criteria: {
          date: { months: [1, 6, 12] },
        },
      };
      renderRulesList([ruleWithMonths]);

      expect(screen.getByText(/Meses: Jan, Jun, Dez/)).toBeInTheDocument();
    });

    it('formats different value operators correctly', () => {
      const ruleWithMinValue = {
        ...mockRule,
        criteria: {
          value: { min: 1000, operator: 'gte' },
        },
      };
      renderRulesList([ruleWithMinValue]);

      expect(screen.getByText(/Valor > R\$ 1\.000/)).toBeInTheDocument();
    });

    it('formats OR description logic correctly', () => {
      const ruleWithOrLogic = {
        ...mockRule,
        criteria: {
          description: { keywords: ['ALUGUEL', 'RENDA'], operator: 'or' },
        },
      };
      renderRulesList([ruleWithOrLogic]);

      expect(screen.getByText(/Palavras: "ALUGUEL" \| "RENDA"/)).toBeInTheDocument();
    });

    it('shows no criteria message when criteria is empty', () => {
      const ruleWithNoCriteria = {
        ...mockRule,
        criteria: {},
      };
      renderRulesList([ruleWithNoCriteria]);

      expect(screen.getByText('Sem critérios definidos')).toBeInTheDocument();
    });
  });

  describe('Multiple Rules', () => {
    it('renders multiple rules correctly', () => {
      const rules = [
        mockRule,
        {
          ...mockRule,
          id: '2',
          name: 'Second Rule',
          isActive: false,
        },
      ];
      renderRulesList(rules);

      expect(screen.getByText('Test Rule')).toBeInTheDocument();
      expect(screen.getByText('Second Rule')).toBeInTheDocument();
    });

    it('handles individual rule operations independently', async () => {
      const user = userEvent.setup();
      const rules = [
        mockRule,
        {
          ...mockRule,
          id: '2',
          name: 'Second Rule',
          isActive: false,
        },
      ];
      renderRulesList(rules);

      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(2);
      
      await user.click(switches[0]); // Toggle first rule

      await waitFor(() => {
        expect(mockToggleRuleStatusAction).toHaveBeenCalledWith('1', false);
        expect(mockToggleRuleStatusAction).not.toHaveBeenCalledWith('2', expect.anything());
      });
    });
  });
});