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
import ValueCriteriaForm from '@/app/regras-categorizacao/components/ValueCriteriaForm';

describe('ValueCriteriaForm', () => {
  const mockOnFormChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderValueCriteriaForm = (defaultValues = {}) => {
    return render(
      <TestWrapper
        defaultValues={defaultValues}
        onFormChange={mockOnFormChange}
      >
        <ValueCriteriaForm form={null as any} />
      </TestWrapper>
    );
  };

  describe('Rendering', () => {
    it('renders the value criteria section with title', () => {
      renderValueCriteriaForm();

      expect(screen.getByText('Critérios de Valor')).toBeInTheDocument();
    });

    it('renders value toggle with description', () => {
      renderValueCriteriaForm();

      expect(screen.getByText('Filtrar por Valor')).toBeInTheDocument();
      expect(screen.getByText('Aplicar apenas em transações com valores específicos.')).toBeInTheDocument();
      
      const valueSwitch = screen.getByRole('switch');
      expect(valueSwitch).toBeInTheDocument();
      expect(valueSwitch).not.toBeChecked();
    });

    it('does not show value inputs initially', () => {
      renderValueCriteriaForm();

      expect(screen.queryByText('Condição')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Valor mínimo')).not.toBeInTheDocument();
    });
  });

  describe('Value Toggle Functionality', () => {
    it('shows value inputs when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();

      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.getByText('Condição')).toBeInTheDocument();
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      });
    });

    it('sets default operator and min value when enabled', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();

      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        const operatorSelect = screen.getByDisplayValue('gte');
        expect(operatorSelect).toBeInTheDocument();
        
        const minInput = screen.getByLabelText('Valor mínimo') as HTMLInputElement;
        expect(minInput.value).toBe('0');
      });
    });

    it('hides value inputs when toggle is disabled', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();

      // Enable first
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.getByText('Condição')).toBeInTheDocument();
      });

      // Disable
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.queryByText('Condição')).not.toBeInTheDocument();
      });
    });
  });

  describe('Operator Selection', () => {
    const enableValueCriteria = async (user: any) => {
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);
      
      await waitFor(() => {
        expect(screen.getByText('Condição')).toBeInTheDocument();
      });
    };

    it('shows all operator options', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      // Check all operator options
      expect(screen.getByText('Maior que')).toBeInTheDocument();
      expect(screen.getByText('Maior ou igual a')).toBeInTheDocument();
      expect(screen.getByText('Menor que')).toBeInTheDocument();
      expect(screen.getByText('Menor ou igual a')).toBeInTheDocument();
      expect(screen.getByText('Igual a')).toBeInTheDocument();
      expect(screen.getByText('Entre')).toBeInTheDocument();
    });

    it('changes operator correctly', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      const equalOption = screen.getByText('Igual a');
      await user.click(equalOption);

      await waitFor(() => {
        // Label should change to just "Valor" for equal operator
        expect(screen.getByLabelText('Valor')).toBeInTheDocument();
        expect(screen.queryByLabelText('Valor mínimo')).not.toBeInTheDocument();
      });
    });

    it('shows correct inputs for "greater than" operators', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      // Default is gte, should show min input
      expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      expect(screen.queryByLabelText('Valor máximo')).not.toBeInTheDocument();

      // Change to gt
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      const gtOption = screen.getByText('Maior que');
      await user.click(gtOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
        expect(screen.queryByLabelText('Valor máximo')).not.toBeInTheDocument();
      });
    });

    it('shows correct inputs for "less than" operators', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      const ltOption = screen.getByText('Menor que');
      await user.click(ltOption);

      await waitFor(() => {
        expect(screen.queryByLabelText('Valor mínimo')).not.toBeInTheDocument();
        expect(screen.getByLabelText('Valor máximo')).toBeInTheDocument();
      });
    });

    it('shows both inputs for "between" operator', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      const betweenOption = screen.getByText('Entre');
      await user.click(betweenOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
        expect(screen.getByLabelText('Valor máximo')).toBeInTheDocument();
      });
    });

    it('shows single input labeled "Valor" for "equal" operator', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);

      const equalOption = screen.getByText('Igual a');
      await user.click(equalOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor')).toBeInTheDocument();
        expect(screen.queryByLabelText('Valor mínimo')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Valor máximo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Value Input Functionality', () => {
    const enableValueCriteria = async (user: any) => {
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      });
    };

    it('updates value inputs correctly', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '100.50');

      expect((minInput as HTMLInputElement).value).toBe('100.50');
    });

    it('handles decimal values correctly', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '1234.56');

      expect((minInput as HTMLInputElement).value).toBe('1234.56');
    });

    it('handles invalid input gracefully', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, 'invalid');

      // Should fall back to 0
      expect((minInput as HTMLInputElement).value).toBe('0');
    });

    it('sets proper input attributes', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo') as HTMLInputElement;
      expect(minInput.type).toBe('number');
      expect(minInput.step).toBe('0.01');
      expect(minInput.min).toBe('0');
      expect(minInput.placeholder).toBe('0,00');
    });
  });

  describe('Description Generation', () => {
    const enableValueCriteria = async (user: any) => {
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      });
    };

    it('shows description for greater than or equal', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '100');

      await waitFor(() => {
        expect(screen.getByText(/Valor maior ou igual a R\$ 100,00/)).toBeInTheDocument();
      });
    });

    it('shows description for greater than', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      // Change operator to greater than
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const gtOption = screen.getByText('Maior que');
      await user.click(gtOption);

      await waitFor(() => {
        const minInput = screen.getByLabelText('Valor mínimo');
        expect(minInput).toBeInTheDocument();
      });

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '100');

      await waitFor(() => {
        expect(screen.getByText(/Valor maior que R\$ 100,00/)).toBeInTheDocument();
      });
    });

    it('shows description for less than', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      // Change operator to less than
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const ltOption = screen.getByText('Menor que');
      await user.click(ltOption);

      await waitFor(() => {
        const maxInput = screen.getByLabelText('Valor máximo');
        expect(maxInput).toBeInTheDocument();
      });

      const maxInput = screen.getByLabelText('Valor máximo');
      await user.clear(maxInput);
      await user.type(maxInput, '500');

      await waitFor(() => {
        expect(screen.getByText(/Valor menor que R\$ 500,00/)).toBeInTheDocument();
      });
    });

    it('shows description for equal', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      // Change operator to equal
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const equalOption = screen.getByText('Igual a');
      await user.click(equalOption);

      await waitFor(() => {
        const valueInput = screen.getByLabelText('Valor');
        expect(valueInput).toBeInTheDocument();
      });

      const valueInput = screen.getByLabelText('Valor');
      await user.clear(valueInput);
      await user.type(valueInput, '250');

      await waitFor(() => {
        expect(screen.getByText(/Valor igual a R\$ 250,00/)).toBeInTheDocument();
      });
    });

    it('shows description for between', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      // Change operator to between
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const betweenOption = screen.getByText('Entre');
      await user.click(betweenOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
        expect(screen.getByLabelText('Valor máximo')).toBeInTheDocument();
      });

      const minInput = screen.getByLabelText('Valor mínimo');
      const maxInput = screen.getByLabelText('Valor máximo');
      
      await user.clear(minInput);
      await user.type(minInput, '100');
      await user.clear(maxInput);
      await user.type(maxInput, '500');

      await waitFor(() => {
        expect(screen.getByText(/Valor entre R\$ 100,00 e R\$ 500,00/)).toBeInTheDocument();
      });
    });

    it('shows note about absolute values', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteria(user);

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '100');

      await waitFor(() => {
        expect(screen.getByText(/Nota: Valores negativos \(despesas\) são comparados pelo valor absoluto\./)).toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('loads existing value criteria correctly', () => {
      const existingValues = {
        criteria: {
          value: {
            operator: 'between',
            min: 100,
            max: 500
          }
        }
      };

      renderValueCriteriaForm(existingValues);

      // Value criteria should be pre-enabled
      const valueSwitch = screen.getByRole('switch');
      expect(valueSwitch).toBeChecked();

      // Operator should be set
      expect(screen.getByDisplayValue('between')).toBeInTheDocument();

      // Values should be loaded
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });

    it('loads different operator types correctly', () => {
      const existingValues = {
        criteria: {
          value: {
            operator: 'eq',
            min: 250
          }
        }
      };

      renderValueCriteriaForm(existingValues);

      expect(screen.getByDisplayValue('eq')).toBeInTheDocument();
      expect(screen.getByDisplayValue('250')).toBeInTheDocument();
      expect(screen.getByLabelText('Valor')).toBeInTheDocument(); // Should show "Valor" not "Valor mínimo"
    });

    it('resets form correctly when operator changes', async () => {
      const user = userEvent.setup();
      const existingValues = {
        criteria: {
          value: {
            operator: 'between',
            min: 100,
            max: 500
          }
        }
      };

      renderValueCriteriaForm(existingValues);

      // Change operator from between to gte
      const operatorSelect = screen.getByText('Entre');
      await user.click(operatorSelect);
      const gteOption = screen.getByText('Maior ou igual a');
      await user.click(gteOption);

      await waitFor(() => {
        // Should only show min input now
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
        expect(screen.queryByLabelText('Valor máximo')).not.toBeInTheDocument();
      });
    });

    it('preserves values when switching to compatible operators', async () => {
      const user = userEvent.setup();
      const existingValues = {
        criteria: {
          value: {
            operator: 'gte',
            min: 100
          }
        }
      };

      renderValueCriteriaForm(existingValues);

      // Change from gte to gt (both use min value)
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const gtOption = screen.getByText('Maior que');
      await user.click(gtOption);

      await waitFor(() => {
        // Min value should be preserved
        const minInput = screen.getByLabelText('Valor mínimo') as HTMLInputElement;
        expect(minInput.value).toBe('100');
      });
    });

    it('sets default values for new operators', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();

      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.getByText('Maior ou igual a')).toBeInTheDocument();
      });

      // Change to less than (should set default max)
      const operatorSelect = screen.getByText('Maior ou igual a');
      await user.click(operatorSelect);
      const ltOption = screen.getByText('Menor que');
      await user.click(ltOption);

      await waitFor(() => {
        const maxInput = screen.getByLabelText('Valor máximo') as HTMLInputElement;
        expect(maxInput.value).toBe('100'); // Default max value
      });
    });
  });

  describe('Currency Formatting', () => {
    const enableValueCriteriaWithValue = async (user: any) => {
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Valor mínimo')).toBeInTheDocument();
      });

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      await user.type(minInput, '1234.56');
    };

    it('formats currency correctly in descriptions', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      await enableValueCriteriaWithValue(user);

      await waitFor(() => {
        expect(screen.getByText(/R\$ 1\.234,56/)).toBeInTheDocument();
      });
    });

    it('handles zero values in formatting', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        expect(screen.getByText(/R\$ 0,00/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty criteria object', () => {
      const emptyValues = { criteria: {} };
      renderValueCriteriaForm(emptyValues);

      expect(screen.getByText('Critérios de Valor')).toBeInTheDocument();
      
      const valueSwitch = screen.getByRole('switch');
      expect(valueSwitch).not.toBeChecked();
    });

    it('handles missing operator in existing criteria', () => {
      const noOperatorValues = {
        criteria: {
          value: { min: 100 }
        }
      };

      renderValueCriteriaForm(noOperatorValues);

      // Should default to gte
      expect(screen.getByDisplayValue('gte')).toBeInTheDocument();
    });

    it('handles undefined min/max values', async () => {
      const user = userEvent.setup();
      renderValueCriteriaForm();
      
      const valueSwitch = screen.getByRole('switch');
      await user.click(valueSwitch);

      await waitFor(() => {
        const minInput = screen.getByLabelText('Valor mínimo');
        expect(minInput).toBeInTheDocument();
      });

      const minInput = screen.getByLabelText('Valor mínimo');
      await user.clear(minInput);
      // Don't type anything - should handle undefined

      // Description should not appear or be empty
      expect(screen.queryByText(/Resumo:/)).not.toBeInTheDocument();
    });
  });
});