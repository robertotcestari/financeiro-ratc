import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

// @vitest-environment jsdom

// Mock the criteria form components
vi.mock('@/app/regras-categorizacao/components/DateCriteriaForm', () => ({
  default: ({ form }: any) => (
    <div data-testid="date-criteria-form">
      <input
        data-testid="date-criteria-input"
        onChange={(e) => form.setValue('criteria.date', { test: e.target.value })}
      />
    </div>
  ),
}));

vi.mock('@/app/regras-categorizacao/components/ValueCriteriaForm', () => ({
  default: ({ form }: any) => (
    <div data-testid="value-criteria-form">
      <input
        data-testid="value-criteria-input"
        type="number"
        onChange={(e) => form.setValue('criteria.value', { min: parseInt(e.target.value) })}
      />
    </div>
  ),
}));

vi.mock('@/app/regras-categorizacao/components/DescriptionCriteriaForm', () => ({
  default: ({ form }: any) => (
    <div data-testid="description-criteria-form">
      <input
        data-testid="description-criteria-input"
        onChange={(e) => form.setValue('criteria.description', { keywords: [e.target.value] })}
      />
    </div>
  ),
}));

vi.mock('@/app/regras-categorizacao/components/AccountCriteriaForm', () => ({
  default: ({ form, bankAccounts }: any) => (
    <div data-testid="account-criteria-form">
      {bankAccounts.map((account: any) => (
        <label key={account.id}>
          <input
            type="checkbox"
            data-testid={`account-${account.id}`}
            onChange={(e) => {
              if (e.target.checked) {
                form.setValue('criteria.accounts', [account.id]);
              } else {
                form.setValue('criteria.accounts', []);
              }
            }}
          />
          {account.name}
        </label>
      ))}
    </div>
  ),
}));

// Import the component after mocking
import RuleForm from '@/app/regras-categorizacao/components/RuleForm';
import type { RuleWithRelations } from '@/lib/database/rule-management';
import type { FormData } from '@/app/regras-categorizacao/components/CreateRuleDialog';

const mockFormData: FormData = {
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
    { id: 'acc-1', name: 'Test Account 1', bank: 'Test Bank' },
    { id: 'acc-2', name: 'Test Account 2', bank: 'Another Bank' },
  ],
};

const mockExistingRule: RuleWithRelations = {
  id: '1',
  name: 'Existing Rule',
  description: 'Existing rule description',
  isActive: true,
  priority: 3,
  categoryId: 'cat-1',
  propertyId: 'prop-1',
  criteria: {
    date: { dayRange: { start: 1, end: 15 } },
    value: { min: 100, operator: 'gte' },
    description: { keywords: ['TEST'], operator: 'and' },
    accounts: ['acc-1'],
  },
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  category: { id: 'cat-1', name: 'Receitas' },
  property: { id: 'prop-1', code: 'TEST-001' },
};

describe('RuleForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderRuleForm = (
    rule?: RuleWithRelations,
    isSubmitting = false
  ) => {
    return render(
      <RuleForm
        rule={rule}
        formData={mockFormData}
        onSubmit={mockOnSubmit}
        isSubmitting={isSubmitting}
        onCancel={mockOnCancel}
      />
    );
  };

  describe('Rendering - Basic Information', () => {
    it('renders all basic form fields', () => {
      renderRuleForm();

      expect(screen.getByText('Nome da Regra *')).toBeInTheDocument();
      expect(screen.getByText('Descrição')).toBeInTheDocument();
      expect(screen.getByText('Prioridade')).toBeInTheDocument();
      expect(screen.getByText('Categoria *')).toBeInTheDocument();
      expect(screen.getByText('Propriedade')).toBeInTheDocument();
    });

    it('renders with empty form for new rules', () => {
      renderRuleForm();

      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal') as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText('Descrição opcional da regra...') as HTMLTextAreaElement;
      const priorityInput = screen.getByDisplayValue('0') as HTMLInputElement;

      expect(nameInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
      expect(priorityInput.value).toBe('0');

      expect(screen.getByText('Criar Regra')).toBeInTheDocument();
    });

    it('renders with existing rule data for editing', () => {
      renderRuleForm(mockExistingRule);

      const nameInput = screen.getByDisplayValue('Existing Rule') as HTMLInputElement;
      const descriptionInput = screen.getByDisplayValue('Existing rule description') as HTMLTextAreaElement;
      const priorityInput = screen.getByDisplayValue('3') as HTMLInputElement;

      expect(nameInput.value).toBe('Existing Rule');
      expect(descriptionInput.value).toBe('Existing rule description');
      expect(priorityInput.value).toBe('3');

      expect(screen.getByText('Atualizar Regra')).toBeInTheDocument();
    });

    it('shows loading state when submitting', () => {
      renderRuleForm(undefined, true);

      const submitButton = screen.getByText('Criar Regra');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Category Selection', () => {
    it('renders all categories in select', async () => {
      renderRuleForm();

      const categorySelect = screen.getByText('Selecione uma categoria');
      await userEvent.click(categorySelect);

      // Categories should be indented based on their level
      expect(screen.getByText('Receitas')).toBeInTheDocument();
      expect(screen.getByText('Despesas')).toBeInTheDocument();
      expect(screen.getByText('  Receitas de Aluguel')).toBeInTheDocument();
    });

    it('selects category correctly', async () => {
      renderRuleForm();

      const categorySelect = screen.getByText('Selecione uma categoria');
      await userEvent.click(categorySelect);

      const categoryOption = screen.getByText('Receitas');
      await userEvent.click(categoryOption);

      // The select should now show the selected category
      await waitFor(() => {
        expect(screen.getByText('Receitas')).toBeInTheDocument();
      });
    });

    it('preselects category for existing rule', () => {
      renderRuleForm(mockExistingRule);

      // The category should be pre-selected (check for the category name text)
      expect(screen.getByText('Receitas')).toBeInTheDocument();
    });
  });

  describe('Property Selection', () => {
    it('renders property options including none option', async () => {
      renderRuleForm();

      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await userEvent.click(propertySelect);

      expect(screen.getByText('Nenhuma propriedade')).toBeInTheDocument();
      expect(screen.getByText('TEST-001 - Test Property')).toBeInTheDocument();
      expect(screen.getByText('TEST-002 - Another Property')).toBeInTheDocument();
    });

    it('handles property selection', async () => {
      renderRuleForm();

      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await userEvent.click(propertySelect);

      const propertyOption = screen.getByText('TEST-001 - Test Property');
      await userEvent.click(propertyOption);

      await waitFor(() => {
        expect(screen.getByText('TEST-001 - Test Property')).toBeInTheDocument();
      });
    });

    it('handles none property selection', async () => {
      renderRuleForm();

      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await userEvent.click(propertySelect);

      const noneOption = screen.getByText('Nenhuma propriedade');
      await userEvent.click(noneOption);

      await waitFor(() => {
        expect(screen.getByText('Nenhuma propriedade')).toBeInTheDocument();
      });
    });
  });

  describe('Criteria Forms', () => {
    it('renders all criteria form components', () => {
      renderRuleForm();

      expect(screen.getByTestId('date-criteria-form')).toBeInTheDocument();
      expect(screen.getByTestId('value-criteria-form')).toBeInTheDocument();
      expect(screen.getByTestId('description-criteria-form')).toBeInTheDocument();
      expect(screen.getByTestId('account-criteria-form')).toBeInTheDocument();
    });

    it('passes bank accounts to account criteria form', () => {
      renderRuleForm();

      expect(screen.getByText('Test Account 1')).toBeInTheDocument();
      expect(screen.getByText('Test Account 2')).toBeInTheDocument();
    });

    it('handles criteria form interactions', async () => {
      renderRuleForm();

      // Test date criteria interaction
      const dateCriteriaInput = screen.getByTestId('date-criteria-input');
      await userEvent.type(dateCriteriaInput, 'test-date');

      // Test value criteria interaction
      const valueCriteriaInput = screen.getByTestId('value-criteria-input');
      await userEvent.type(valueCriteriaInput, '100');

      // Test description criteria interaction
      const descriptionCriteriaInput = screen.getByTestId('description-criteria-input');
      await userEvent.type(descriptionCriteriaInput, 'TEST');

      // Test account criteria interaction
      const accountCheckbox = screen.getByTestId('account-acc-1');
      await userEvent.click(accountCheckbox);

      // Inputs should have been updated
      expect(dateCriteriaInput).toHaveValue('test-date');
      expect(valueCriteriaInput).toHaveValue(100);
      expect(descriptionCriteriaInput).toHaveValue('TEST');
      expect(accountCheckbox).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('requires name field', async () => {
      renderRuleForm();

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      // Form should not submit and show validation error
      await waitFor(() => {
        expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('requires category field', async () => {
      renderRuleForm();

      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal');
      await userEvent.type(nameInput, 'Test Rule');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      // Form should not submit without category
      await waitFor(() => {
        expect(screen.getByText('Categoria é obrigatória')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates priority range', async () => {
      renderRuleForm();

      const priorityInput = screen.getByDisplayValue('0');
      await user.tripleClick(priorityInput);
      await user.type(priorityInput, '101'); // Above max

      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal');
      await userEvent.type(nameInput, 'Test Rule');

      // Select category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await userEvent.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await userEvent.click(categoryOption);

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      // Form should not submit with invalid priority - wait for validation message
      await waitFor(() => {
        // The validation error should appear
        const errorElements = document.querySelectorAll('[role="alert"]');
        expect(errorElements.length).toBeGreaterThan(0);
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('validates name length', async () => {
      renderRuleForm();

      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal');
      const longName = 'A'.repeat(101); // Above max length
      await userEvent.type(nameInput, longName);

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Nome deve ter no máximo 100 caracteres')).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('submits form with correct data for new rule', async () => {
      renderRuleForm();

      // Fill out basic fields
      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal');
      await userEvent.type(nameInput, 'New Test Rule');

      const descriptionInput = screen.getByPlaceholderText('Descrição opcional da regra...');
      await userEvent.type(descriptionInput, 'New rule description');

      const priorityInput = screen.getByDisplayValue('0');
      await user.tripleClick(priorityInput);
      await user.type(priorityInput, '5');

      // Select category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await userEvent.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await userEvent.click(categoryOption);

      // Select property
      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await userEvent.click(propertySelect);
      const propertyOption = screen.getByText('TEST-001 - Test Property');
      await userEvent.click(propertyOption);

      // Add some criteria
      const descriptionCriteriaInput = screen.getByTestId('description-criteria-input');
      await userEvent.type(descriptionCriteriaInput, 'ALUGUEL');

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Test Rule',
          description: 'New rule description',
          categoryId: 'cat-1',
          propertyId: 'prop-1',
          priority: 5,
          criteria: expect.objectContaining({
            description: { keywords: ['ALUGUEL'] },
          }),
        });
      });
    });

    it('transforms property "none" value correctly', async () => {
      renderRuleForm();

      const nameInput = screen.getByPlaceholderText('Ex: Aluguel Mensal');
      await userEvent.type(nameInput, 'Test Rule');

      // Select category
      const categorySelect = screen.getByText('Selecione uma categoria');
      await userEvent.click(categorySelect);
      const categoryOption = screen.getByText('Receitas');
      await userEvent.click(categoryOption);

      // Select "none" property
      const propertySelect = screen.getByText('Selecione uma propriedade (opcional)');
      await userEvent.click(propertySelect);
      const noneOption = screen.getByText('Nenhuma propriedade');
      await userEvent.click(noneOption);

      const submitButton = screen.getByText('Criar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Rule',
          description: '',
          categoryId: 'cat-1',
          propertyId: undefined, // Should be transformed from "none" to undefined
          priority: 0,
          criteria: {},
        });
      });
    });

    it('submits form with existing rule data', async () => {
      renderRuleForm(mockExistingRule);

      // Modify the name
      const nameInput = screen.getByDisplayValue('Existing Rule');
      await user.tripleClick(nameInput);
      await user.type(nameInput, 'Updated Rule Name');

      const submitButton = screen.getByText('Atualizar Regra');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Updated Rule Name',
          description: 'Existing rule description',
          categoryId: 'cat-1',
          propertyId: 'prop-1',
          priority: 3,
          criteria: expect.objectContaining({
            date: { dayRange: { start: 1, end: 15 } },
            value: { min: 100, operator: 'gte' },
            description: { keywords: ['TEST'], operator: 'and' },
            accounts: ['acc-1'],
          }),
        });
      });
    });

    it('disables submit button when submitting', () => {
      renderRuleForm(undefined, true);

      const submitButton = screen.getByText('Criar Regra');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Actions', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      renderRuleForm();

      const cancelButton = screen.getByText('Cancelar');
      await userEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading spinner when submitting', () => {
      renderRuleForm(undefined, true);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Form Sections', () => {
    it('renders all form sections with correct titles', () => {
      renderRuleForm();

      expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      expect(screen.getByText('Categorização')).toBeInTheDocument();
      expect(screen.getByText('Critérios da Regra')).toBeInTheDocument();
    });

    it('shows helpful descriptions for form sections', () => {
      renderRuleForm();

      expect(screen.getByText('Defina o nome, descrição e prioridade da regra.')).toBeInTheDocument();
      expect(screen.getByText('Defina para qual categoria e propriedade as transações devem ser direcionadas.')).toBeInTheDocument();
      expect(screen.getByText('Configure os critérios que uma transação deve atender para ser categorizada por esta regra.')).toBeInTheDocument();
    });

    it('includes helpful field descriptions', () => {
      renderRuleForm();

      expect(screen.getByText('Nome descritivo para identificar facilmente esta regra.')).toBeInTheDocument();
      expect(screen.getByText('Prioridade da regra (0-100). Regras com maior prioridade são aplicadas primeiro.')).toBeInTheDocument();
      expect(screen.getByText('Propriedade opcional a ser associada às transações que atendem esta regra.')).toBeInTheDocument();
    });
  });
});