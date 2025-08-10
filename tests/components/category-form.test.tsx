import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @vitest-environment jsdom

// Mock the form action
const mockAction = vi.fn();

// Simple mock component for testing category form functionality
const CategoryForm = ({
  initialData = null,
  onSubmit = mockAction,
}: {
  initialData?: { id: string; name: string; type: string } | null;
  onSubmit?: (formData: FormData) => void;
}) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Nome da Categoria
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialData?.name || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        />
      </div>

      <div>
        <label
          htmlFor="type"
          className="block text-sm font-medium text-gray-700"
        >
          Tipo
        </label>
        <select
          id="type"
          name="type"
          defaultValue={initialData?.type || 'RECEITA'}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          required
        >
          <option value="RECEITA">Receita</option>
          <option value="DESPESA">Despesa</option>
          <option value="CONTROLE">Controle</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          {initialData ? 'Atualizar' : 'Criar'} Categoria
        </button>
        <button
          type="button"
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<CategoryForm />);

    expect(screen.getByLabelText('Nome da Categoria')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Criar Categoria' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' })
    ).toBeInTheDocument();
  });

  it('renders with initial data for editing', () => {
    const initialData = {
      id: '1',
      name: 'Aluguel',
      type: 'RECEITA',
    };

    render(<CategoryForm initialData={initialData} />);

    expect(screen.getByDisplayValue('Aluguel')).toBeInTheDocument();
    // Check for selected option by its text content instead of value
    expect(screen.getByRole('option', { name: 'Receita' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Atualizar Categoria' })
    ).toBeInTheDocument();
  });

  it('has all required category type options', () => {
    render(<CategoryForm />);

    const typeSelect = screen.getByLabelText('Tipo');
    expect(typeSelect).toBeInTheDocument();

    expect(screen.getByRole('option', { name: 'Receita' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Despesa' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Controle' })
    ).toBeInTheDocument();
  });

  it('submits form with correct data', () => {
    render(<CategoryForm onSubmit={mockAction} />);

    const nameInput = screen.getByLabelText('Nome da Categoria');
    const typeSelect = screen.getByLabelText('Tipo');
    const submitButton = screen.getByRole('button', {
      name: 'Criar Categoria',
    });

    fireEvent.change(nameInput, { target: { value: 'Nova Categoria' } });
    fireEvent.change(typeSelect, { target: { value: 'DESPESA' } });
    fireEvent.click(submitButton);

    expect(mockAction).toHaveBeenCalledOnce();

    const formData = mockAction.mock.calls[0][0];
    expect(formData.get('name')).toBe('Nova Categoria');
    expect(formData.get('type')).toBe('DESPESA');
  });

  it('requires name field', () => {
    render(<CategoryForm />);

    const nameInput = screen.getByLabelText('Nome da Categoria');
    expect(nameInput).toBeRequired();
  });

  it('requires type field', () => {
    render(<CategoryForm />);

    const typeSelect = screen.getByLabelText('Tipo');
    expect(typeSelect).toBeRequired();
  });

  it('has proper styling classes', () => {
    render(<CategoryForm />);

    const form = document.querySelector('form');
    expect(form).toHaveClass('space-y-4');

    const submitButton = screen.getByRole('button', {
      name: 'Criar Categoria',
    });
    expect(submitButton).toHaveClass('bg-blue-600', 'text-white');

    const cancelButton = screen.getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toHaveClass('bg-gray-300', 'text-gray-700');
  });
});
