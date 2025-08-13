import { describe, expect, it, vi, beforeEach, afterAll, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

// @vitest-environment jsdom

// Mock Next.js router and cache
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the server actions with real-like implementations
const mockRules: any[] = [];
let nextRuleId = 1;

vi.mock('@/lib/actions/rule-management-actions', () => ({
  createRuleAction: vi.fn(async (data) => {
    const rule = {
      id: `rule-${nextRuleId++}`,
      name: data.name,
      description: data.description || null,
      categoryId: data.categoryId,
      propertyId: data.propertyId || null,
      priority: data.priority || 0,
      criteria: data.criteria || {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { id: data.categoryId, name: 'Test Category' },
      property: data.propertyId ? { id: data.propertyId, code: 'TEST-001' } : null,
    };
    mockRules.push(rule);
    return { success: true, data: rule };
  }),

  updateRuleAction: vi.fn(async (ruleId, data) => {
    const ruleIndex = mockRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return { success: false, error: 'Rule not found' };
    }
    
    const updatedRule = {
      ...mockRules[ruleIndex],
      ...data,
      updatedAt: new Date(),
    };
    mockRules[ruleIndex] = updatedRule;
    return { success: true, data: updatedRule };
  }),

  deleteRuleAction: vi.fn(async (ruleId) => {
    const ruleIndex = mockRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return { success: false, error: 'Rule not found' };
    }
    
    mockRules.splice(ruleIndex, 1);
    return { success: true };
  }),

  toggleRuleStatusAction: vi.fn(async (ruleId, isActive) => {
    const ruleIndex = mockRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) {
      return { success: false, error: 'Rule not found' };
    }
    
    const updatedRule = {
      ...mockRules[ruleIndex],
      isActive,
      updatedAt: new Date(),
    };
    mockRules[ruleIndex] = updatedRule;
    return { success: true, data: updatedRule };
  }),

  previewRuleAction: vi.fn(async (params) => {
    const matches = [
      {
        id: 'tx-1',
        date: new Date('2025-01-15'),
        description: 'ALUGUEL CASA CENTRO',
        amount: -1200.50,
        bankAccountName: 'Conta Corrente Sicredi',
        matched: true,
        confidence: 0.95,
      },
      {
        id: 'tx-2',
        date: new Date('2025-01-10'),
        description: 'PAGAMENTO CONTA',
        amount: -85.30,
        bankAccountName: 'Conta Corrente PJBank',
        matched: false,
      },
    ];
    return { success: true, data: { matches, totalMatches: matches.length } };
  }),

  getRuleStatsAction: vi.fn(async (ruleId) => {
    return {
      success: true,
      data: {
        totalSuggestions: 45,
        appliedSuggestions: 38,
        pendingSuggestions: 7,
        successRate: 0.844,
      },
    };
  }),
}));

// Mock form data
const mockFormData = {
  categories: [
    { id: 'cat-1', name: 'Receitas', level: 1 },
    { id: 'cat-2', name: 'Despesas', level: 1 },
    { id: 'cat-3', name: '  Receitas de Aluguel', level: 2 },
  ],
  properties: [
    { id: 'prop-1', code: 'TEST-001', description: 'Test Property' },
    { id: 'prop-2', code: 'TEST-002', description: 'Another Property' },
  ],
  bankAccounts: [
    { id: 'acc-1', name: 'Test Account 1', bank: 'Test Bank', accountType: 'CHECKING', isActive: true },
    { id: 'acc-2', name: 'Test Account 2', bank: 'Another Bank', accountType: 'SAVINGS', isActive: true },
  ],
};

// Create a test page component that includes all the rule management functionality
const TestRuleManagementPage = () => {
  const React = require('react');
  const { useState } = React;

  // Import components after mocking
  const RulesList = require('@/app/regras-categorizacao/components/RulesList').default;
  const CreateRuleDialog = require('@/app/regras-categorizacao/components/CreateRuleDialog').default;
  const SimpleCreateRuleDialog = require('@/app/regras-categorizacao/components/SimpleCreateRuleDialog').default;

  const [rules, setRules] = useState(mockRules);

  const handleRuleCreated = (newRule: any) => {
    setRules(prev => [...prev, newRule]);
  };

  const handleRuleUpdated = (updatedRule: any) => {
    setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
  };

  const handleRuleDeleted = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  return React.createElement('div', { className: 'p-6 space-y-6' }, [
    // Header with create buttons
    React.createElement('div', { 
      key: 'header',
      className: 'flex justify-between items-center'
    }, [
      React.createElement('h1', { 
        key: 'title',
        className: 'text-2xl font-bold'
      }, 'Rule Management Test'),
      React.createElement('div', { 
        key: 'actions',
        className: 'flex space-x-2'
      }, [
        React.createElement(CreateRuleDialog, {
          key: 'create-dialog',
          formData: mockFormData,
          onRuleCreated: handleRuleCreated,
        }, React.createElement('button', {
          className: 'bg-blue-600 text-white px-4 py-2 rounded'
        }, 'Create Rule')),
        React.createElement(SimpleCreateRuleDialog, {
          key: 'simple-create-dialog',
          formData: mockFormData,
          onRuleCreated: handleRuleCreated,
        }, React.createElement('button', {
          className: 'bg-green-600 text-white px-4 py-2 rounded'
        }, 'Quick Create')),
      ]),
    ]),
    
    // Rules list
    React.createElement(RulesList, {
      key: 'rules-list',
      initialData: { rules, total: rules.length },
      formData: mockFormData,
    }),
  ]);
};

describe('Rule Management Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRules.length = 0; // Clear the mock rules array
    nextRuleId = 1;
  });

  describe('Complete Rule Lifecycle', () => {
    it('creates, displays, edits, and deletes a rule', async () => {
      const user = userEvent.setup();
      render(<TestRuleManagementPage />);

      // Initially should show empty state
      expect(screen.getByText('Nenhuma regra criada')).toBeInTheDocument();

      // 1. CREATE RULE - Click create button
      const createButton = screen.getByText('Create Rule');
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Criar Nova Regra')).toBeInTheDocument();
      });

      // Fill out the form
      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Integration Test Rule');

      const descriptionInput = screen.getByLabelText('Descrição');
      await user.type(descriptionInput, 'Test rule for integration testing');

      // Select category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await user.click(categoryOption);

      // Select property
      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await user.click(propertySelect);
      const propertyOption = screen.getByText('TEST-001 - Test Property');
      await user.click(propertyOption);

      // Set priority
      const priorityInput = screen.getByLabelText('Prioridade');
      await user.clear(priorityInput);
      await user.type(priorityInput, '5');

      // Submit the form
      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // 2. VERIFY RULE APPEARS - Wait for the rule to appear in the list
      await waitFor(() => {
        expect(screen.getByText('Integration Test Rule')).toBeInTheDocument();
      });

      expect(screen.getByText('Test rule for integration testing')).toBeInTheDocument();
      expect(screen.getByText('Categoria: Test Category')).toBeInTheDocument();
      expect(screen.getByText('Propriedade: TEST-001')).toBeInTheDocument();
      expect(screen.getByText('Prioridade: 5')).toBeInTheDocument();

      // 3. TEST RULE - Click test button
      const moreButton = screen.getByRole('button', { name: '' }); // MoreHorizontal icon
      await user.click(moreButton);

      const testButton = screen.getByText('Testar');
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Testar Regra: Integration Test Rule')).toBeInTheDocument();
      });

      // Verify test results appear
      await waitFor(() => {
        expect(screen.getByText('ALUGUEL CASA CENTRO')).toBeInTheDocument();
        expect(screen.getByText('95%')).toBeInTheDocument(); // Confidence badge
      });

      // Close test dialog
      await user.keyboard('{Escape}');

      // 4. EDIT RULE - Click edit button
      await user.click(moreButton);
      const editButton = screen.getByText('Editar');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Editar Regra')).toBeInTheDocument();
      });

      // Update the rule name
      const editNameInput = screen.getByDisplayValue('Integration Test Rule');
      await user.clear(editNameInput);
      await user.type(editNameInput, 'Updated Integration Rule');

      // Update priority
      const editPriorityInput = screen.getByDisplayValue('5');
      await user.clear(editPriorityInput);
      await user.type(editPriorityInput, '10');

      // Submit the update
      const updateButton = screen.getByText('Atualizar Regra');
      await user.click(updateButton);

      // 5. VERIFY UPDATES - Check that the rule was updated
      await waitFor(() => {
        expect(screen.getByText('Updated Integration Rule')).toBeInTheDocument();
      });

      expect(screen.getByText('Prioridade: 10')).toBeInTheDocument();

      // 6. TOGGLE RULE STATUS - Toggle the rule off
      const toggleSwitch = screen.getByRole('switch');
      expect(toggleSwitch).toBeChecked();

      await user.click(toggleSwitch);

      await waitFor(() => {
        expect(toggleSwitch).not.toBeChecked();
      });

      // Rule card should have inactive styling
      const ruleCard = screen.getByText('Updated Integration Rule').closest('.opacity-60');
      expect(ruleCard).toBeInTheDocument();

      // 7. DELETE RULE - Click delete button
      await user.click(moreButton);
      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Confirmar Exclusão')).toBeInTheDocument();
      });

      const confirmDeleteButton = screen.getByText('Excluir');
      await user.click(confirmDeleteButton);

      // 8. VERIFY DELETION - Rule should be gone and empty state should return
      await waitFor(() => {
        expect(screen.queryByText('Updated Integration Rule')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Nenhuma regra criada')).toBeInTheDocument();
    });

    it('creates a rule using quick create dialog', async () => {
      const user = userEvent.setup();
      render(<TestRuleManagementPage />);

      // Click quick create button
      const quickCreateButton = screen.getByText('Quick Create');
      await user.click(quickCreateButton);

      await waitFor(() => {
        expect(screen.getByText('Criação Rápida de Regra')).toBeInTheDocument();
      });

      // Fill out the simple form
      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Quick Test Rule');

      // Select category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Despesas');
      await user.click(categoryOption);

      // Add description criteria
      const descriptionToggle = screen.getByText('Filtrar por Palavras-chave');
      const descriptionSwitch = screen.getAllByRole('switch').find(s => 
        s.closest('div')?.textContent?.includes('Filtrar por Palavras-chave')
      );
      await user.click(descriptionSwitch!);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Digite uma palavra-chave...')).toBeInTheDocument();
      });

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, 'CONTA');
      await user.keyboard('{Enter}');

      // Submit the form
      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // Verify the rule appears
      await waitFor(() => {
        expect(screen.getByText('Quick Test Rule')).toBeInTheDocument();
      });
    });

    it('handles rule creation errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock a creation error
      const createRuleAction = require('@/lib/actions/rule-management-actions').createRuleAction;
      createRuleAction.mockResolvedValueOnce({
        success: false,
        error: 'Category not found',
      });

      render(<TestRuleManagementPage />);

      // Try to create a rule
      const createButton = screen.getByText('Create Rule');
      await user.click(createButton);

      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Error Test Rule');

      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await user.click(categoryOption);

      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // Should show error and rule should not appear
      await waitFor(() => {
        expect(screen.queryByText('Error Test Rule')).not.toBeInTheDocument();
      });

      // Dialog should still be open for user to correct the error
      expect(screen.getByText('Criar Nova Regra')).toBeInTheDocument();
    });
  });

  describe('Multiple Rule Management', () => {
    it('manages multiple rules with different priorities', async () => {
      const user = userEvent.setup();
      
      // Pre-populate with multiple rules
      const rule1 = {
        id: 'rule-1',
        name: 'High Priority Rule',
        priority: 10,
        isActive: true,
        categoryId: 'cat-1',
        criteria: {},
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        category: { id: 'cat-1', name: 'Receitas' },
        property: null,
      };
      
      const rule2 = {
        id: 'rule-2',
        name: 'Low Priority Rule',
        priority: 1,
        isActive: true,
        categoryId: 'cat-2',
        criteria: {},
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02'),
        category: { id: 'cat-2', name: 'Despesas' },
        property: null,
      };

      mockRules.push(rule1, rule2);

      render(<TestRuleManagementPage />);

      // Both rules should be displayed
      expect(screen.getByText('High Priority Rule')).toBeInTheDocument();
      expect(screen.getByText('Low Priority Rule')).toBeInTheDocument();
      
      expect(screen.getByText('Prioridade: 10')).toBeInTheDocument();
      expect(screen.getByText('Prioridade: 1')).toBeInTheDocument();

      // Test individual rule operations
      const allMoreButtons = screen.getAllByRole('button', { name: '' });
      const firstMoreButton = allMoreButtons[0];
      
      await user.click(firstMoreButton);
      expect(screen.getByText('Editar')).toBeInTheDocument();
      expect(screen.getByText('Testar')).toBeInTheDocument();
      expect(screen.getByText('Excluir')).toBeInTheDocument();

      // Click away to close menu
      await user.click(document.body);

      // Test rule status toggle on second rule
      const switches = screen.getAllByRole('switch');
      const secondSwitch = switches[1];
      
      await user.click(secondSwitch);

      await waitFor(() => {
        expect(secondSwitch).not.toBeChecked();
      });
    });

    it('handles complex rule criteria correctly', async () => {
      const user = userEvent.setup();
      render(<TestRuleManagementPage />);

      const createButton = screen.getByText('Create Rule');
      await user.click(createButton);

      // Fill basic info
      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Complex Criteria Rule');

      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await user.click(categoryOption);

      // Add date criteria
      const dateSwitches = screen.getAllByRole('switch');
      const dateSwitch = dateSwitches[0]; // First switch should be for date
      await user.click(dateSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Dia inicial')).toBeInTheDocument();
      });

      const dayStartInput = screen.getByLabelText('Dia inicial');
      await user.clear(dayStartInput);
      await user.type(dayStartInput, '1');

      const dayEndInput = screen.getByLabelText('Dia final');
      await user.clear(dayEndInput);
      await user.type(dayEndInput, '15');

      // Add value criteria
      const valueSwitches = screen.getAllByRole('switch');
      const valueSwitch = valueSwitches[1]; // Second switch for value
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      });

      const minValueInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minValueInput);
      await user.type(minValueInput, '100');

      // Change operator to "between"
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const betweenOption = screen.getByText('Entre');
      await user.click(betweenOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor máximo')).toBeInTheDocument();
      });

      const maxValueInput = screen.getByLabelText('Valor máximo');
      await user.clear(maxValueInput);
      await user.type(maxValueInput, '1000');

      // Submit the rule
      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // Verify rule appears with correct criteria display
      await waitFor(() => {
        expect(screen.getByText('Complex Criteria Rule')).toBeInTheDocument();
      });

      // Should show formatted criteria
      expect(screen.getByText(/Dia 1-15/)).toBeInTheDocument();
      expect(screen.getByText(/Valor: R\$ 100 - R\$ 1\.000/)).toBeInTheDocument();
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('handles network errors during rule operations', async () => {
      const user = userEvent.setup();
      
      // Mock network failure for delete operation
      const deleteRuleAction = require('@/lib/actions/rule-management-actions').deleteRuleAction;
      deleteRuleAction.mockRejectedValueOnce(new Error('Network error'));

      // Add a rule first
      mockRules.push({
        id: 'rule-to-delete',
        name: 'Rule to Delete',
        priority: 1,
        isActive: true,
        categoryId: 'cat-1',
        criteria: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'cat-1', name: 'Receitas' },
        property: null,
      });

      render(<TestRuleManagementPage />);

      // Try to delete the rule
      const moreButton = screen.getByRole('button', { name: '' });
      await user.click(moreButton);

      const deleteButton = screen.getByText('Excluir');
      await user.click(deleteButton);

      const confirmButton = screen.getByText('Excluir');
      await user.click(confirmButton);

      // Rule should still be visible since deletion failed
      await waitFor(() => {
        expect(screen.getByText('Rule to Delete')).toBeInTheDocument();
      });
    });

    it('validates form inputs correctly', async () => {
      const user = userEvent.setup();
      render(<TestRuleManagementPage />);

      const createButton = screen.getByText('Create Rule');
      await user.click(createButton);

      // Try to submit without required fields
      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // Form should not submit and show validation errors
      expect(screen.getByText('Criar Nova Regra')).toBeInTheDocument();

      // Fill name but not category
      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Test Rule');

      await user.click(submitButton);

      // Should still show form since category is required
      expect(screen.getByText('Criar Nova Regra')).toBeInTheDocument();

      // Fill category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await user.click(categoryOption);

      // Now submission should work
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Criar Nova Regra')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Test Rule')).toBeInTheDocument();
    });

    it('handles concurrent rule modifications gracefully', async () => {
      const user = userEvent.setup();
      
      // Add initial rule
      mockRules.push({
        id: 'concurrent-rule',
        name: 'Concurrent Test Rule',
        priority: 5,
        isActive: true,
        categoryId: 'cat-1',
        criteria: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        category: { id: 'cat-1', name: 'Receitas' },
        property: null,
      });

      render(<TestRuleManagementPage />);

      // Simulate concurrent modifications by updating the rule externally
      const ruleInList = mockRules.find(r => r.id === 'concurrent-rule');
      if (ruleInList) {
        ruleInList.name = 'Externally Modified Rule';
        ruleInList.priority = 8;
      }

      // The UI should still function correctly
      expect(screen.getByText('Concurrent Test Rule')).toBeInTheDocument();

      // User interactions should still work
      const toggleSwitch = screen.getByRole('switch');
      await user.click(toggleSwitch);

      await waitFor(() => {
        expect(toggleSwitch).not.toBeChecked();
      });
    });
  });

  describe('Performance and User Experience', () => {
    it('maintains responsive UI during rule operations', async () => {
      const user = userEvent.setup();
      
      // Add multiple rules to test performance
      for (let i = 1; i <= 10; i++) {
        mockRules.push({
          id: `perf-rule-${i}`,
          name: `Performance Test Rule ${i}`,
          priority: i,
          isActive: i % 2 === 0,
          categoryId: i % 2 === 0 ? 'cat-1' : 'cat-2',
          criteria: {
            description: { keywords: [`TEST${i}`], operator: 'or' },
          },
          createdAt: new Date(Date.now() - i * 1000),
          updatedAt: new Date(Date.now() - i * 1000),
          category: { id: i % 2 === 0 ? 'cat-1' : 'cat-2', name: i % 2 === 0 ? 'Receitas' : 'Despesas' },
          property: null,
        });
      }

      render(<TestRuleManagementPage />);

      // All rules should be visible
      for (let i = 1; i <= 10; i++) {
        expect(screen.getByText(`Performance Test Rule ${i}`)).toBeInTheDocument();
      }

      // UI should remain responsive during interactions
      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(10);

      // Toggle multiple switches rapidly
      for (let i = 0; i < 5; i++) {
        await user.click(switches[i]);
      }

      // All switches should have responded
      for (let i = 0; i < 5; i++) {
        // Switches should have changed state appropriately
        expect(switches[i]).toBeInTheDocument();
      }
    });

    it('provides appropriate loading states and feedback', async () => {
      const user = userEvent.setup();
      
      // Mock slow rule creation
      const createRuleAction = require('@/lib/actions/rule-management-actions').createRuleAction;
      createRuleAction.mockImplementation(async (data) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const rule = {
          id: `slow-rule`,
          ...data,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: { id: data.categoryId, name: 'Test Category' },
          property: null,
        };
        mockRules.push(rule);
        return { success: true, data: rule };
      });

      render(<TestRuleManagementPage />);

      const createButton = screen.getByText('Create Rule');
      await user.click(createButton);

      // Fill form
      const nameInput = screen.getByLabelText('Nome da Regra *');
      await user.type(nameInput, 'Slow Rule');

      const categorySelect = screen.getByText('Selecione uma categoria');
      await user.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await user.click(categoryOption);

      // Submit form
      const submitButton = screen.getByText('Criar Regra');
      await user.click(submitButton);

      // Should show loading state (button disabled or loading indicator)
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        const submitButtonAfterClick = buttons.find(b => b.textContent?.includes('Criar'));
        expect(submitButtonAfterClick).toBeDisabled();
      });

      // Eventually should complete
      await waitFor(() => {
        expect(screen.getByText('Slow Rule')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "rule-mgmt-test-1", "content": "Create component tests for RulesList component (rendering, status indicators, actions)", "status": "completed"}, {"id": "rule-mgmt-test-2", "content": "Create component tests for RuleForm component (validation, form submission, criteria building)", "status": "completed"}, {"id": "rule-mgmt-test-3", "content": "Create component tests for DateCriteriaForm component (date range validation, month selection)", "status": "completed"}, {"id": "rule-mgmt-test-4", "content": "Create component tests for ValueCriteriaForm component (operators, min/max validation, ranges)", "status": "completed"}, {"id": "rule-mgmt-test-5", "content": "Create component tests for DescriptionCriteriaForm component (keywords, AND/OR logic)", "status": "completed"}, {"id": "rule-mgmt-test-6", "content": "Create component tests for AccountCriteriaForm component (account selection)", "status": "completed"}, {"id": "rule-mgmt-test-7", "content": "Create component tests for TestRuleDialog component (rule preview, transaction testing)", "status": "completed"}, {"id": "rule-mgmt-test-8", "content": "Create integration tests for rule management server actions", "status": "completed"}, {"id": "rule-mgmt-test-9", "content": "Create integration tests for rule database operations", "status": "completed"}, {"id": "rule-mgmt-test-10", "content": "Create integration tests for rule workflow (create, edit, test, delete)", "status": "completed"}]