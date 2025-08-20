import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from '../../components/ui/combobox';

describe('Combobox Inline Edit Behavior', () => {
  it('should remain open when clicking on the combobox trigger', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    
    const options = [
      { value: 'cat1', label: 'Categoria 1' },
      { value: 'cat2', label: 'Categoria 2' },
      { value: 'cat3', label: 'Categoria 3' },
    ];

    render(
      <div>
        <Combobox
          options={options}
          value="cat1"
          onValueChange={onValueChange}
          placeholder="Selecionar categoria"
          searchPlaceholder="Buscar categoria..."
          emptyMessage="Nenhuma categoria encontrada."
          allowClear={true}
          data-testid="combobox-trigger"
        />
      </div>
    );

    // Encontrar o combobox pelo test id (evita conflito com o input interno que também usa role="combobox")
    const combobox = screen.getByTestId('combobox-trigger');
    expect(combobox).toBeInTheDocument();

    // Clicar para abrir
    await user.click(combobox);

    // Verificar que o campo de busca apareceu
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Buscar categoria...');
      expect(searchInput).toBeInTheDocument();
    });

    // O combobox deve continuar acessível
    expect(screen.getByTestId('combobox-trigger')).toBeInTheDocument();
  });

  it('should allow selecting an option without closing prematurely', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    
    const options = [
      { value: 'cat1', label: 'Categoria 1' },
      { value: 'cat2', label: 'Categoria 2' },
      { value: 'cat3', label: 'Categoria 3' },
    ];

    render(
      <Combobox
        options={options}
        value="cat1"
        onValueChange={onValueChange}
        placeholder="Selecionar categoria"
        searchPlaceholder="Buscar categoria..."
        emptyMessage="Nenhuma categoria encontrada."
        allowClear={true}
      />
    );

    // Clicar para abrir
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Buscar uma categoria
    const searchInput = screen.getByPlaceholderText('Buscar categoria...');
    await user.type(searchInput, 'Categoria 2');

    // Selecionar a categoria
    const option = await screen.findByText('Categoria 2');
    await user.click(option);

    // Verificar que o callback foi chamado
    expect(onValueChange).toHaveBeenCalledWith('cat2');
  });

  it('should allow clearing selection when allowClear is true', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    
    const options = [
      { value: 'cat1', label: 'Categoria 1' },
      { value: 'cat2', label: 'Categoria 2' },
    ];

    render(
      <Combobox
        options={options}
        value="cat1"
        onValueChange={onValueChange}
        placeholder="Selecionar categoria"
        searchPlaceholder="Buscar categoria..."
        emptyMessage="Nenhuma categoria encontrada."
        allowClear={true}
        clearLabel="Sem categoria"
      />
    );

    // Abrir o combobox
    const combobox = screen.getByRole('combobox');
    await user.click(combobox);

    // Clicar na opção de limpar
    const clearOption = await screen.findByText('Sem categoria');
    await user.click(clearOption);

    // Verificar que o callback foi chamado com string vazia
    expect(onValueChange).toHaveBeenCalledWith('');
  });

  it('should handle focus without triggering unwanted blur events', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    
    const options = [
      { value: 'cat1', label: 'Categoria 1' },
      { value: 'cat2', label: 'Categoria 2' },
    ];

    render(
      <div>
        <Combobox
          options={options}
          value="cat1"
          onValueChange={onValueChange}
          placeholder="Selecionar categoria"
          searchPlaceholder="Buscar categoria..."
          emptyMessage="Nenhuma categoria encontrada."
          allowClear={true}
          data-testid="combobox-trigger"
        />
        <input type="text" placeholder="Outro campo" />
      </div>
    );

    // Clicar no combobox pelo test id (evita conflito com o input interno que também usa role="combobox")
    const combobox = screen.getByTestId('combobox-trigger');
    await user.click(combobox);

    // Digitar no campo de busca não deve fechar o dropdown
    const searchInput = await screen.findByPlaceholderText('Buscar categoria...');
    await user.type(searchInput, 'Cat');

    // O campo de busca ainda deve estar visível
    expect(screen.getByPlaceholderText('Buscar categoria...')).toBeInTheDocument();

    // Clicar fora fecha o dropdown
    const otherField = screen.getByPlaceholderText('Outro campo');
    await user.click(otherField);

    // O campo de busca não deve mais estar visível
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Buscar categoria...')).not.toBeInTheDocument();
    });
  });
});
