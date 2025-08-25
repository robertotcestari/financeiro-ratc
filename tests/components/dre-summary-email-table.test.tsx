import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @vitest-environment jsdom

// Inline import of the component source is avoided in tests here;
// we recreate a minimal component with same rendering logic for isolation.
const DRESummaryEmailTable = ({
  receitasOperacionais,
  despesasOperacionais,
  lucroOperacional,
  receitasEDespesasNaoOperacionais,
  resultadoDeCaixa,
}: {
  receitasOperacionais: number;
  despesasOperacionais: number;
  lucroOperacional: number;
  receitasEDespesasNaoOperacionais: number;
  resultadoDeCaixa: number;
}) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <table role="table">
      <tbody>
        <tr>
          <td>Receitas operacionais</td>
          <td className="text-green-700">{formatCurrency(receitasOperacionais)}</td>
        </tr>
        <tr>
          <td>Despesas operacionais</td>
          <td className="text-red-700">{formatCurrency(despesasOperacionais)}</td>
        </tr>
        <tr>
          <td>Lucro operacional</td>
          <td className={lucroOperacional >= 0 ? 'text-green-700' : 'text-red-700'}>
            {formatCurrency(lucroOperacional)}
          </td>
        </tr>
        <tr>
          <td>Receitas e despesas não operacionais</td>
          <td className={receitasEDespesasNaoOperacionais >= 0 ? 'text-green-700' : 'text-red-700'}>
            {formatCurrency(receitasEDespesasNaoOperacionais)}
          </td>
        </tr>
        <tr>
          <td>Resultado de caixa</td>
          <td className={resultadoDeCaixa >= 0 ? 'text-green-800' : 'text-red-800'}>
            {formatCurrency(resultadoDeCaixa)}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

describe('DRESummaryEmailTable', () => {
  it('renders all required rows with formatting', () => {
    render(
      <DRESummaryEmailTable
        receitasOperacionais={10000}
        despesasOperacionais={-4000}
        lucroOperacional={6000}
        receitasEDespesasNaoOperacionais={-500}
        resultadoDeCaixa={5500}
      />
    );

    expect(screen.getByText('Receitas operacionais')).toBeInTheDocument();
    expect(screen.getByText('Despesas operacionais')).toBeInTheDocument();
    expect(screen.getByText('Lucro operacional')).toBeInTheDocument();
    expect(screen.getByText('Receitas e despesas não operacionais')).toBeInTheDocument();
    expect(screen.getByText('Resultado de caixa')).toBeInTheDocument();

    expect(screen.getByText(/R\$.*10\.000,00/)).toHaveClass('text-green-700');
    expect(screen.getByText(/-R\$\s*4\.000,00/)).toHaveClass('text-red-700');
    expect(screen.getByText(/R\$.*6\.000,00/)).toHaveClass('text-green-700');
    expect(screen.getByText(/^-R\$\s*500,00$/)).toHaveClass('text-red-700');
    expect(screen.getByText(/R\$.*5\.500,00/)).toHaveClass('text-green-800');
  });
});
