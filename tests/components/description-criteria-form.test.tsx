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
import DescriptionCriteriaForm from '@/app/regras-categorizacao/components/DescriptionCriteriaForm';

describe('DescriptionCriteriaForm', () => {
  const mockOnFormChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDescriptionCriteriaForm = (defaultValues = {}) => {
    return render(
      <TestWrapper
        defaultValues={defaultValues}
        onFormChange={mockOnFormChange}
      >
        <DescriptionCriteriaForm form={null as any} />
      </TestWrapper>
    );
  };

  describe('Rendering', () => {
    it('renders the description criteria section with title', () => {
      renderDescriptionCriteriaForm();

      expect(screen.getByText('Critérios de Descrição')).toBeInTheDocument();
    });

    it('renders description toggle with description', () => {
      renderDescriptionCriteriaForm();

      expect(screen.getByText('Filtrar por Palavras-chave')).toBeInTheDocument();
      expect(screen.getByText('Aplicar apenas em transações que contêm palavras ou frases específicas.')).toBeInTheDocument();
      
      const descriptionSwitch = screen.getByRole('switch');
      expect(descriptionSwitch).toBeInTheDocument();
      expect(descriptionSwitch).not.toBeChecked();
    });

    it('does not show keyword inputs initially', () => {
      renderDescriptionCriteriaForm();

      expect(screen.queryByText('Palavras-chave')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Digite uma palavra-chave...')).not.toBeInTheDocument();
    });
  });

  describe('Description Toggle Functionality', () => {
    it('shows keyword inputs when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await waitFor(() => {
        expect(screen.getByText('Palavras-chave')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Digite uma palavra-chave...')).toBeInTheDocument();
      });
    });

    it('shows default settings when enabled', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await waitFor(() => {
        expect(screen.getByText('Adicione pelo menos uma palavra-chave')).toBeInTheDocument();
      });
    });

    it('hides keyword inputs when toggle is disabled', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      // Enable first
      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await waitFor(() => {
        expect(screen.getByText('Palavras-chave')).toBeInTheDocument();
      });

      // Disable
      await user.click(descriptionSwitch);

      await waitFor(() => {
        expect(screen.queryByText('Palavras-chave')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyword Management', () => {
    const enableDescriptionCriteria = async (user: any) => {
      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Digite uma palavra-chave...')).toBeInTheDocument();
      });
    };

    it('adds keywords when plus button is clicked', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      const addButton = screen.getByRole('button', { name: '' }); // Plus button

      await user.type(keywordInput, 'ALUGUEL');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('ALUGUEL')).toBeInTheDocument();
        expect(screen.getByText('Palavras adicionadas')).toBeInTheDocument();
      });
    });

    it('adds keywords when Enter is pressed', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');

      await user.type(keywordInput, 'RENDA');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('RENDA')).toBeInTheDocument();
      });
    });

    it('clears input after adding keyword', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...') as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: '' });

      await user.type(keywordInput, 'TEST');
      await user.click(addButton);

      await waitFor(() => {
        expect(keywordInput.value).toBe('');
      });
    });

    it('trims whitespace from keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      const addButton = screen.getByRole('button', { name: '' });

      await user.type(keywordInput, '  TRIMMED  ');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('TRIMMED')).toBeInTheDocument();
      });
    });

    it('prevents adding duplicate keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      const addButton = screen.getByRole('button', { name: '' });

      // Add first keyword
      await user.type(keywordInput, 'DUPLICATE');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('DUPLICATE')).toBeInTheDocument();
      });

      // Try to add the same keyword again
      await user.type(keywordInput, 'DUPLICATE');
      await user.click(addButton);

      // Should still only have one instance
      const duplicateElements = screen.getAllByText('DUPLICATE');
      expect(duplicateElements).toHaveLength(1);
    });

    it('prevents adding empty keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const addButton = screen.getByRole('button', { name: '' });
      expect(addButton).toBeDisabled();

      // Try adding whitespace only
      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, '   ');
      
      expect(addButton).toBeDisabled();
    });

    it('removes keywords when X is clicked', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      const addButton = screen.getByRole('button', { name: '' });

      // Add keyword
      await user.type(keywordInput, 'REMOVEME');
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('REMOVEME')).toBeInTheDocument();
      });

      // Find and click the X button
      const removeButtons = screen.getAllByRole('button');
      const xButton = removeButtons.find(btn => 
        btn.querySelector('svg') && btn.className.includes('h-auto')
      );
      
      if (xButton) {
        await user.click(xButton);
      }

      await waitFor(() => {
        expect(screen.queryByText('REMOVEME')).not.toBeInTheDocument();
      });
    });

    it('displays multiple keywords as badges', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      // Add multiple keywords
      await user.type(keywordInput, 'FIRST');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'SECOND');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('FIRST')).toBeInTheDocument();
        expect(screen.getByText('SECOND')).toBeInTheDocument();
      });
    });
  });

  describe('Logic Operator Selection', () => {
    const addMultipleKeywords = async (user: any) => {
      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      await user.type(keywordInput, 'FIRST');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'SECOND');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('FIRST')).toBeInTheDocument();
        expect(screen.getByText('SECOND')).toBeInTheDocument();
      });
    };

    it('does not show logic selection with only one keyword', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, 'SINGLE');
      await user.keyboard('{Enter}');

      expect(screen.queryByText('Lógica de Combinação')).not.toBeInTheDocument();
    });

    it('shows logic selection with multiple keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await addMultipleKeywords(user);

      expect(screen.getByText('Lógica de Combinação')).toBeInTheDocument();
    });

    it('defaults to OR operator', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await addMultipleKeywords(user);

      expect(screen.getByDisplayValue('or')).toBeInTheDocument();
      expect(screen.getByText('A transação deve conter pelo menos uma das palavras-chave')).toBeInTheDocument();
    });

    it('changes to AND operator correctly', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await addMultipleKeywords(user);

      const operatorSelect = screen.getByText('OU (qualquer palavra-chave)');
      await user.click(operatorSelect);

      const andOption = screen.getByText('E (todas as palavras-chave)');
      await user.click(andOption);

      await waitFor(() => {
        expect(screen.getByText('A transação deve conter todas as palavras-chave')).toBeInTheDocument();
      });
    });

    it('shows correct operator options', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      await addMultipleKeywords(user);

      const operatorSelect = screen.getByText('OU (qualquer palavra-chave)');
      await user.click(operatorSelect);

      expect(screen.getByText('OU (qualquer palavra-chave)')).toBeInTheDocument();
      expect(screen.getByText('E (todas as palavras-chave)')).toBeInTheDocument();
    });
  });

  describe('Case Sensitivity Toggle', () => {
    const enableDescriptionCriteria = async (user: any) => {
      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Digite uma palavra-chave...')).toBeInTheDocument();
      });
    };

    it('renders case sensitivity toggle', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      expect(screen.getByText('Sensível a maiúsculas/minúsculas')).toBeInTheDocument();
      expect(screen.getByText('Se ativado, "ALUGUEL" será diferente de "aluguel".')).toBeInTheDocument();
      
      const caseSensitiveSwitch = screen.getAllByRole('switch')[1]; // Second switch
      expect(caseSensitiveSwitch).not.toBeChecked();
    });

    it('toggles case sensitivity correctly', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const caseSensitiveSwitch = screen.getAllByRole('switch')[1];
      await user.click(caseSensitiveSwitch);

      expect(caseSensitiveSwitch).toBeChecked();
    });

    it('updates description based on case sensitivity', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      // Add a keyword first
      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, 'TEST');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/\(sem diferenciar maiúsculas\/minúsculas\)/)).toBeInTheDocument();
      });

      // Enable case sensitivity
      const caseSensitiveSwitch = screen.getAllByRole('switch')[1];
      await user.click(caseSensitiveSwitch);

      await waitFor(() => {
        expect(screen.queryByText(/\(sem diferenciar maiúsculas\/minúsculas\)/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Description Preview', () => {
    const enableDescriptionCriteria = async (user: any) => {
      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Digite uma palavra-chave...')).toBeInTheDocument();
      });
    };

    it('shows default message when no keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      expect(screen.getByText('Adicione pelo menos uma palavra-chave')).toBeInTheDocument();
    });

    it('shows correct description for single keyword', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, 'SINGLE');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/Transações que \(sem diferenciar maiúsculas\/minúsculas\) contêm "SINGLE"/)).toBeInTheDocument();
      });
    });

    it('shows correct description for multiple keywords with OR', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      await user.type(keywordInput, 'FIRST');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'SECOND');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/contêm "FIRST" OU "SECOND"/)).toBeInTheDocument();
      });
    });

    it('shows correct description for multiple keywords with AND', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      await user.type(keywordInput, 'FIRST');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'SECOND');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Lógica de Combinação')).toBeInTheDocument();
      });

      // Change to AND
      const operatorSelect = screen.getByText('OU (qualquer palavra-chave)');
      await user.click(operatorSelect);

      const andOption = screen.getByText('E (todas as palavras-chave)');
      await user.click(andOption);

      await waitFor(() => {
        expect(screen.getByText(/contêm "FIRST" E "SECOND"/)).toBeInTheDocument();
      });
    });

    it('shows case sensitive description correctly', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();
      
      await enableDescriptionCriteria(user);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      await user.type(keywordInput, 'CASE');
      await user.keyboard('{Enter}');

      // Enable case sensitivity
      const caseSensitiveSwitch = screen.getAllByRole('switch')[1];
      await user.click(caseSensitiveSwitch);

      await waitFor(() => {
        expect(screen.getByText(/Transações que contêm "CASE"/)).toBeInTheDocument();
        expect(screen.queryByText(/\(sem diferenciar maiúsculas\/minúsculas\)/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('loads existing description criteria correctly', () => {
      const existingValues = {
        criteria: {
          description: {
            keywords: ['ALUGUEL', 'RENDA'],
            operator: 'and',
            caseSensitive: true
          }
        }
      };

      renderDescriptionCriteriaForm(existingValues);

      // Description criteria should be pre-enabled
      const descriptionSwitch = screen.getAllByRole('switch')[0];
      expect(descriptionSwitch).toBeChecked();

      // Keywords should be loaded
      expect(screen.getByText('ALUGUEL')).toBeInTheDocument();
      expect(screen.getByText('RENDA')).toBeInTheDocument();

      // Operator should be set
      expect(screen.getByDisplayValue('and')).toBeInTheDocument();

      // Case sensitivity should be enabled
      const caseSensitiveSwitch = screen.getAllByRole('switch')[1];
      expect(caseSensitiveSwitch).toBeChecked();
    });

    it('loads with default values when operator is missing', () => {
      const existingValues = {
        criteria: {
          description: {
            keywords: ['TEST']
          }
        }
      };

      renderDescriptionCriteriaForm(existingValues);

      expect(screen.getByDisplayValue('or')).toBeInTheDocument();
    });

    it('clears criteria correctly when disabled', async () => {
      const user = userEvent.setup();
      const existingValues = {
        criteria: {
          description: {
            keywords: ['CLEAR', 'ME'],
            operator: 'and',
            caseSensitive: true
          }
        }
      };

      renderDescriptionCriteriaForm(existingValues);

      // Should be enabled initially
      const descriptionSwitch = screen.getAllByRole('switch')[0];
      expect(descriptionSwitch).toBeChecked();

      // Disable
      await user.click(descriptionSwitch);

      expect(descriptionSwitch).not.toBeChecked();
      expect(screen.queryByText('CLEAR')).not.toBeInTheDocument();
      expect(screen.queryByText('ME')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty criteria object', () => {
      const emptyValues = { criteria: {} };
      renderDescriptionCriteriaForm(emptyValues);

      expect(screen.getByText('Critérios de Descrição')).toBeInTheDocument();
      
      const descriptionSwitch = screen.getByRole('switch');
      expect(descriptionSwitch).not.toBeChecked();
    });

    it('handles keyboard events correctly', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      // Test Enter key
      await user.type(keywordInput, 'ENTER_TEST');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('ENTER_TEST')).toBeInTheDocument();
      });

      // Test other keys don't trigger addition
      await user.type(keywordInput, 'SPACE_TEST');
      await user.keyboard('{Space}');
      
      // Should not add the keyword
      expect((keywordInput as HTMLInputElement).value).toBe('SPACE_TEST ');
    });

    it('handles special characters in keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      await user.type(keywordInput, 'TEST@#$%');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('TEST@#$%')).toBeInTheDocument();
      });
    });

    it('maintains state when adding and removing keywords', async () => {
      const user = userEvent.setup();
      renderDescriptionCriteriaForm();

      const descriptionSwitch = screen.getByRole('switch');
      await user.click(descriptionSwitch);

      const keywordInput = screen.getByPlaceholderText('Digite uma palavra-chave...');
      
      // Add multiple keywords
      await user.type(keywordInput, 'FIRST');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'SECOND');
      await user.keyboard('{Enter}');
      
      await user.type(keywordInput, 'THIRD');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Lógica de Combinação')).toBeInTheDocument();
      });

      // Remove middle keyword
      const secondKeyword = screen.getByText('SECOND');
      const removeButton = secondKeyword.parentElement?.querySelector('button');
      
      if (removeButton) {
        await user.click(removeButton);
      }

      // Should still show logic selection with remaining keywords
      await waitFor(() => {
        expect(screen.getByText('FIRST')).toBeInTheDocument();
        expect(screen.queryByText('SECOND')).not.toBeInTheDocument();
        expect(screen.getByText('THIRD')).toBeInTheDocument();
        expect(screen.getByText('Lógica de Combinação')).toBeInTheDocument();
      });
    });
  });
});