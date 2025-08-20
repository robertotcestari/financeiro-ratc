import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

// @vitest-environment jsdom

// Mock the criteria form components
vi.mock('@/app/(protected)/regras-categorizacao/components/DateCriteriaForm', () => ({
  default: ({ form }: any) => (
    <div data-testid="date-criteria-form">
      <input
        data-testid="date-criteria-input"
        onChange={(e) => form.setValue('criteria.date', { test: e.target.value })}
      />
    </div>
  ),
}));

vi.mock('@/app/(protected)/regras-categorizacao/components/ValueCriteriaForm', () => ({
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

vi.mock('@/app/(protected)/regras-categorizacao/components/DescriptionCriteriaForm', () => ({
  default: ({ form }: any) => (
    <div data-testid="description-criteria-form">
      <input
        data-testid="description-criteria-input"
        onChange={(e) => form.setValue('criteria.description', { keywords: [e.target.value] })}
      />
    </div>
  ),
}));

vi.mock('@/app/(protected)/regras-categorizacao/components/AccountCriteriaForm', () => ({
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
import RuleForm from '@/app/(protected)/regras-categorizacao/components/RuleForm';
import type { RuleWithRelations } from '@/lib/core/database/rule-management';
import type { FormData } from '@/app/(protected)/regras-categorizacao/components/CreateRuleDialog';

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




  describe('Form Sections', () => {
    it('renders all form sections with correct titles', () => {
      renderRuleForm();

      expect(screen.getByText('Informações Básicas')).toBeInTheDocument();
      expect(screen.getByText('Categorização')).toBeInTheDocument();
      expect(screen.getByText('Critérios da Regra')).toBeInTheDocument();
    });


    it('includes helpful field descriptions', () => {
      renderRuleForm();

      expect(screen.getByText('Nome descritivo para identificar facilmente esta regra.')).toBeInTheDocument();
      expect(screen.getByText('Prioridade da regra (0-100). Regras com maior prioridade são aplicadas primeiro.')).toBeInTheDocument();
      expect(screen.getByText('Propriedade opcional para regras de aluguel. Deixe vazio para regras gerais que não precisam estar vinculadas a um imóvel específico.')).toBeInTheDocument();
    });
  });
});