'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountType } from '@/app/generated/prisma';
import { deleteBankAccount } from '../actions';
import { Button } from '@/components/ui/button';

interface BankAccountListProps {
  accounts: Array<{
    id: string;
    name: string;
    bankName: string;
    accountType: AccountType;
    isActive: boolean;
    createdAt: Date;
    _count: {
      transactions: number;
    };
  }>;
}

export function BankAccountList({ accounts }: BankAccountListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a conta "${name}"?`)) {
      return;
    }

    setDeletingId(id);
    const result = await deleteBankAccount(id);
    
    if (!result.success) {
      alert(result.error || 'Erro ao excluir conta');
    } else {
      router.refresh();
    }
    
    setDeletingId(null);
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case AccountType.CHECKING:
        return 'Conta Corrente';
      case AccountType.SAVINGS:
        return 'Poupança';
      case AccountType.INVESTMENT:
        return 'Investimento';
      default:
        return type;
    }
  };

  const getAccountTypeColor = (type: AccountType) => {
    switch (type) {
      case AccountType.CHECKING:
        return 'bg-blue-100 text-blue-800';
      case AccountType.SAVINGS:
        return 'bg-green-100 text-green-800';
      case AccountType.INVESTMENT:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome da Conta
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Banco
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transações
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accounts.map((account) => (
            <tr key={account.id} className={!account.isActive ? 'bg-gray-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {account.name}
                </div>
                <div className="text-xs text-gray-500">
                  Criada em {new Date(account.createdAt).toLocaleDateString('pt-BR')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {account.bankName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccountTypeColor(account.accountType)}`}>
                  {getAccountTypeLabel(account.accountType)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="text-sm text-gray-900">
                  {account._count.transactions.toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  account.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {account.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Button
                  onClick={() => router.push(`/cadastros/contas/${account.id}`)}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => handleDelete(account.id, account.name)}
                  disabled={deletingId === account.id || account._count.transactions > 0}
                  variant="ghost"
                  size="sm"
                  className={account._count.transactions > 0 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}
                  title={account._count.transactions > 0 ? 'Conta possui transações' : 'Excluir conta'}
                >
                  {deletingId === account.id ? 'Excluindo...' : 'Excluir'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {accounts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma conta bancária cadastrada</p>
        </div>
      )}
    </div>
  );
}