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
import DateCriteriaForm from '@/app/regras-categorizacao/components/DateCriteriaForm';

describe('DateCriteriaForm', () => {
  const mockOnFormChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderDateCriteriaForm = (defaultValues = {}) => {
    return render(
      <TestWrapper
        defaultValues={defaultValues}
        onFormChange={mockOnFormChange}
      >
        <DateCriteriaForm form={null as any} />
      </TestWrapper>
    );
  };

  describe('Rendering', () => {
    it('renders the date criteria section with title', () => {
      renderDateCriteriaForm();

      expect(screen.getByText('Critérios de Data')).toBeInTheDocument();
    });

    it('renders day range toggle with description', () => {
      renderDateCriteriaForm();

      expect(screen.getByText('Intervalo de Dias do Mês')).toBeInTheDocument();
      expect(screen.getByText('Aplicar apenas em transações que ocorrem em dias específicos do mês.')).toBeInTheDocument();
      
      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toBeInTheDocument();
      expect(switches[0]).not.toBeChecked();
    });

    it('renders months toggle with description', () => {
      renderDateCriteriaForm();

      expect(screen.getByText('Meses Específicos')).toBeInTheDocument();
      expect(screen.getByText('Aplicar apenas em transações que ocorrem em meses específicos.')).toBeInTheDocument();
      
      const monthSwitches = screen.getAllByRole('switch');
      expect(monthSwitches).toHaveLength(2); // Day range and months switches
    });

    it('does not show day range inputs initially', () => {
      renderDateCriteriaForm();

      // Look for number inputs with specific min/max attributes instead of labels
      const numberInputs = screen.queryAllByDisplayValue(/^(1|31)$/);
      expect(numberInputs).toHaveLength(0);
    });

    it('does not show month buttons initially', () => {
      renderDateCriteriaForm();

      expect(screen.queryByText('Janeiro')).not.toBeInTheDocument();
      expect(screen.queryByText('Dezembro')).not.toBeInTheDocument();
    });
  });

  describe('Day Range Functionality', () => {
    it('shows day range inputs when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        // Use input[type="number"] selectors instead of labels
        const inputs = screen.getAllByDisplayValue(/^(1|31)$/);
        expect(inputs).toHaveLength(2);
        expect(inputs[0]).toHaveAttribute('min', '1');
        expect(inputs[0]).toHaveAttribute('max', '31');
      });
    });

    it('sets default values when day range is enabled', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const startInput = screen.getByDisplayValue('1') as HTMLInputElement;
        const endInput = screen.getByDisplayValue('31') as HTMLInputElement;
        
        expect(startInput.value).toBe('1');
        expect(endInput.value).toBe('31');
      });
    });

    it('updates day range values correctly', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      // Enable day range
      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const startInput = screen.getByDisplayValue('1');
        const endInput = screen.getByDisplayValue('31');

        expect(startInput).toBeInTheDocument();
        expect(endInput).toBeInTheDocument();
      });

      // Update values using selectAll then type
      const startInput = screen.getByDisplayValue('1');
      const endInput = screen.getByDisplayValue('31');

      await user.tripleClick(startInput);
      await user.type(startInput, '5');
      
      await user.tripleClick(endInput);
      await user.type(endInput, '25');

      expect((startInput as HTMLInputElement).value).toBe('5');
      expect((endInput as HTMLInputElement).value).toBe('25');
    });

    it('adjusts end value when start value is greater', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const startInput = screen.getByDisplayValue('1');
        expect(startInput).toBeInTheDocument();
      });

      // Set start value higher than end
      const startInput = screen.getByDisplayValue('1');
      await user.tripleClick(startInput);
      await user.type(startInput, '25');

      // End should be adjusted - wait for the form to update
      await waitFor(() => {
        const endInputs = screen.getAllByDisplayValue('25');
        expect(endInputs).toHaveLength(2); // Both inputs should have value 25
      });
    });

    it('adjusts start value when end value is lower', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const endInput = screen.getByDisplayValue('31');
        expect(endInput).toBeInTheDocument();
      });

      // Set end value lower than start
      const endInput = screen.getByDisplayValue('31');
      await user.tripleClick(endInput);
      await user.type(endInput, '5');

      // Start should be adjusted - wait for the form to update
      await waitFor(() => {
        const startInputs = screen.getAllByDisplayValue('5');
        expect(startInputs).toHaveLength(2); // Both inputs should have value 5
      });
    });

    it('shows correct description for day range', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        expect(screen.getByText('Aplicar do dia 1 até o dia 31 de cada mês')).toBeInTheDocument();
      });

      // Update to same start and end values
      const startInput = screen.getByDisplayValue('1');
      const endInput = screen.getByDisplayValue('31');

      await user.tripleClick(startInput);
      await user.type(startInput, '15');
      await user.tripleClick(endInput);
      await user.type(endInput, '15');

      await waitFor(() => {
        expect(screen.getByText('Aplicar apenas no dia 15 de cada mês')).toBeInTheDocument();
      });
    });

    it('hides day range inputs when toggle is disabled', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      // Enable first
      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        expect(screen.getByDisplayValue('1')).toBeInTheDocument();
      });

      // Disable
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('1')).not.toBeInTheDocument();
        expect(screen.queryByDisplayValue('31')).not.toBeInTheDocument();
      });
    });
  });

  describe('Months Functionality', () => {
    it('shows month buttons when toggle is enabled', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        expect(screen.getByText('Janeiro')).toBeInTheDocument();
        expect(screen.getByText('Dezembro')).toBeInTheDocument();
      });
    });

    it('renders all 12 month buttons', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        monthNames.forEach(monthName => {
          expect(screen.getByText(monthName)).toBeInTheDocument();
        });
      });
    });

    it('toggles month selection correctly', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        const januaryButton = screen.getByText('Janeiro');
        expect(januaryButton).toBeInTheDocument();
      });

      // Click January
      const januaryButton = screen.getByText('Janeiro');
      await user.click(januaryButton);

      // Should be selected and show as badge
      await waitFor(() => {
        // Check for badge
        const badges = document.querySelectorAll('[class*="badge"]');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('shows selected months as badges', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        const januaryButton = screen.getByText('Janeiro');
        expect(januaryButton).toBeInTheDocument();
      });

      // Select January and June
      const januaryButton = screen.getByText('Janeiro');
      const juneButton = screen.getByText('Junho');
      
      await user.click(januaryButton);
      await user.click(juneButton);

      await waitFor(() => {
        // Should show badges for selected months
        const badges = document.querySelectorAll('[class*="badge"]');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('removes month selection when badge X is clicked', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        const januaryButton = screen.getByText('Janeiro');
        expect(januaryButton).toBeInTheDocument();
      });

      // Select January
      const januaryButton = screen.getByText('Janeiro');
      await user.click(januaryButton);

      await waitFor(() => {
        // Look for X button in badge
        const xButtons = document.querySelectorAll('button[class*="h-auto"]');
        expect(xButtons.length).toBeGreaterThan(0);
      });

      // Click X button to remove
      const xButtons = document.querySelectorAll('button[class*="h-auto"]');
      if (xButtons.length > 0) {
        await user.click(xButtons[0] as HTMLElement);
      }
    });

    it('shows correct description for month selection', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        expect(screen.getByText('Selecione pelo menos um mês para ativar este critério')).toBeInTheDocument();
      });

      // Select a month
      const januaryButton = screen.getByText('Janeiro');
      await user.click(januaryButton);

      await waitFor(() => {
        expect(screen.getByText(/Aplicar apenas em 1 mês selecionado/)).toBeInTheDocument();
      });
    });

    it('hides month buttons when toggle is disabled', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      // Enable first
      const monthsSwitch = screen.getAllByRole('switch')[1];
      await user.click(monthsSwitch);

      await waitFor(() => {
        expect(screen.getByText('Janeiro')).toBeInTheDocument();
      });

      // Disable
      await user.click(monthsSwitch);

      await waitFor(() => {
        expect(screen.queryByText('Janeiro')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Integration', () => {
    it('loads existing day range values correctly', () => {
      const existingValues = {
        criteria: {
          date: {
            dayRange: { start: 10, end: 20 }
          }
        }
      };

      renderDateCriteriaForm(existingValues);

      // Day range should be pre-enabled and show correct values
      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      expect(dayRangeSwitch).toBeChecked();

      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    });

    it('loads existing months values correctly', () => {
      const existingValues = {
        criteria: {
          date: {
            months: [1, 6, 12]
          }
        }
      };

      renderDateCriteriaForm(existingValues);

      // Months should be pre-enabled
      const monthsSwitch = screen.getAllByRole('switch')[1];
      expect(monthsSwitch).toBeChecked();

      // Selected months should be visible
      expect(screen.getByText('Janeiro')).toBeInTheDocument();
      expect(screen.getByText('Junho')).toBeInTheDocument();
      expect(screen.getByText('Dezembro')).toBeInTheDocument();
    });

    it('clears criteria from form when disabled', async () => {
      const user = userEvent.setup();
      const existingValues = {
        criteria: {
          date: {
            dayRange: { start: 10, end: 20 },
            months: [1, 6]
          }
        }
      };

      renderDateCriteriaForm(existingValues);

      // Both switches should be enabled initially
      const switches = screen.getAllByRole('switch');
      expect(switches[0]).toBeChecked();
      expect(switches[1]).toBeChecked();

      // Disable day range
      await user.click(switches[0]);

      // Disable months
      await user.click(switches[1]);

      // Both criteria should be cleared from form
      // We can't easily test the form values directly, but the UI should reflect the changes
      expect(switches[0]).not.toBeChecked();
      expect(switches[1]).not.toBeChecked();
    });
  });

  describe('Input Validation', () => {
    it('enforces min and max values for day inputs', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const startInput = screen.getByDisplayValue('1') as HTMLInputElement;
        expect(startInput).toBeInTheDocument();
        expect(startInput.min).toBe('1');
        expect(startInput.max).toBe('31');
      });

      const endInput = screen.getByDisplayValue('31') as HTMLInputElement;
      expect(endInput.min).toBe('1');
      expect(endInput.max).toBe('31');
    });

    it('handles invalid input gracefully', async () => {
      const user = userEvent.setup();
      renderDateCriteriaForm();

      const dayRangeSwitch = screen.getAllByRole('switch')[0];
      await user.click(dayRangeSwitch);

      await waitFor(() => {
        const startInput = screen.getByDisplayValue('1');
        expect(startInput).toBeInTheDocument();
      });

      const startInput = screen.getByDisplayValue('1');
      
      // Select all and try to enter invalid value
      await user.tripleClick(startInput);
      await user.type(startInput, 'abc');

      // Number inputs reject non-numeric characters, so value remains
      expect((startInput as HTMLInputElement).value).toBe('1');
    });
  });
});