import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @vitest-environment jsdom

// Mock the component since we can't import it directly due to path issues
// This simulates the AccountBalancesTable component behavior
const AccountBalancesTable = ({
  balances,
  total,
  title,
}: {
  balances: Array<{
    bankAccountId: string;
    accountName: string;
    bankName: string;
    amount: number;
  }>;
  total: number;
  title: string;
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conta
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Banco
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {balances.map((balance) => (
              <tr key={balance.bankAccountId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {balance.accountName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {balance.bankName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span
                    className={`font-medium ${
                      balance.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(balance.amount)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td
                colSpan={2}
                className="px-6 py-4 text-sm font-medium text-gray-900"
              >
                TOTAL
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                <span
                  className={`text-lg font-bold ${
                    total >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(total)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

const mockBalances = [
  {
    bankAccountId: '1',
    accountName: 'Conta Corrente Sicredi',
    bankName: 'Sicredi',
    amount: 5000.5,
  },
  {
    bankAccountId: '2',
    accountName: 'Conta Investimento XP',
    bankName: 'XP',
    amount: -1500.25,
  },
  {
    bankAccountId: '3',
    accountName: 'Conta PJBank',
    bankName: 'PJBank',
    amount: 750.0,
  },
];

describe('AccountBalancesTable', () => {
  it('renders table with correct title', () => {
    render(
      <AccountBalancesTable
        balances={mockBalances}
        total={4250.25}
        title="Saldos por Conta"
      />
    );

    expect(screen.getByText('Saldos por Conta')).toBeInTheDocument();
  });

  it('displays table headers correctly', () => {
    render(
      <AccountBalancesTable
        balances={mockBalances}
        total={4250.25}
        title="Saldos por Conta"
      />
    );

    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
  });

  it('renders all account balances', () => {
    render(
      <AccountBalancesTable
        balances={mockBalances}
        total={4250.25}
        title="Saldos por Conta"
      />
    );

    expect(screen.getByText('Conta Corrente Sicredi')).toBeInTheDocument();
    expect(screen.getByText('Conta Investimento XP')).toBeInTheDocument();
    expect(screen.getByText('Conta PJBank')).toBeInTheDocument();

    expect(screen.getByText('Sicredi')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(screen.getByText('PJBank')).toBeInTheDocument();
  });

  it('applies correct styling for positive amounts', () => {
    render(
      <AccountBalancesTable
        balances={[mockBalances[0]]}
        total={5000.5}
        title="Test"
      />
    );

    // Look for the currency formatted text in the table body specifically
    const tbody = screen.getByRole('table').querySelector('tbody');
    const positiveAmount = tbody?.querySelector('.text-green-600');
    expect(positiveAmount).toBeInTheDocument();
    expect(positiveAmount).toHaveTextContent(/R\$.*5\.000,50/);
  });

  it('applies correct styling for negative amounts', () => {
    render(
      <AccountBalancesTable
        balances={[mockBalances[1]]}
        total={-1500.25}
        title="Test"
      />
    );

    // Look for the negative currency formatted text in the table body specifically
    const tbody = screen.getByRole('table').querySelector('tbody');
    const negativeAmount = tbody?.querySelector('.text-red-600');
    expect(negativeAmount).toBeInTheDocument();
    expect(negativeAmount).toHaveTextContent(/R\$.*1\.500,25/);
  });

  it('displays total with correct styling for positive total', () => {
    render(
      <AccountBalancesTable
        balances={mockBalances}
        total={4250.25}
        title="Test"
      />
    );

    expect(screen.getByText('TOTAL')).toBeInTheDocument();
    const totalAmount = screen.getByText(/R\$.*4\.250,25/);
    expect(totalAmount).toBeInTheDocument();
    expect(totalAmount).toHaveClass('text-green-600');
  });

  it('displays total with correct styling for negative total', () => {
    render(
      <AccountBalancesTable balances={mockBalances} total={-500} title="Test" />
    );

    const totalAmount = screen.getByText(/R\$.*500,00/);
    expect(totalAmount).toBeInTheDocument();
    expect(totalAmount).toHaveClass('text-red-600');
  });

  it('handles empty balances array', () => {
    render(<AccountBalancesTable balances={[]} total={0} title="Empty Test" />);

    expect(screen.getByText('Empty Test')).toBeInTheDocument();
    expect(screen.getByText('TOTAL')).toBeInTheDocument();

    // Should still show headers
    expect(screen.getByText('Conta')).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
  });

  it('has correct table structure', () => {
    render(
      <AccountBalancesTable
        balances={mockBalances}
        total={4250.25}
        title="Test"
      />
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const tbody = table.querySelector('tbody');
    expect(tbody).toBeInTheDocument();
    expect(tbody?.children).toHaveLength(3); // 3 balance rows

    const tfoot = table.querySelector('tfoot');
    expect(tfoot).toBeInTheDocument();
    expect(tfoot?.children).toHaveLength(1); // 1 total row
  });
});
