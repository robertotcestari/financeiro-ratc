'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AccountType } from '@/app/generated/prisma';
import {
  createBankAccount,
  updateBankAccount,
  BankAccountFormData,
} from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BankAccountFormProps {
  account?: {
    id: string;
    name: string;
    bankName: string;
    accountType: AccountType;
    isActive: boolean;
  };
}

export function BankAccountForm({ account }: BankAccountFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<BankAccountFormData>({
    name: account?.name || '',
    bankName: account?.bankName || '',
    accountType: account?.accountType || AccountType.CHECKING,
    isActive: account?.isActive ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = account
        ? await updateBankAccount(account.id, formData)
        : await createBankAccount(formData);

      if (result.success) {
        router.push('/cadastros/contas');
        router.refresh();
      } else {
        setError(result.error || 'Erro ao salvar conta');
      }
    } catch {
      setError('Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nome da Conta *
        </label>
        <Input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: CC - Sicredi"
        />
        <p className="mt-1 text-sm text-gray-500">
          Nome único para identificar a conta no sistema
        </p>
      </div>

      <div>
        <label
          htmlFor="bankName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nome do Banco *
        </label>
        <Input
          type="text"
          id="bankName"
          required
          value={formData.bankName}
          onChange={(e) =>
            setFormData({ ...formData, bankName: e.target.value })
          }
          placeholder="Ex: Sicredi, PJBank, XP"
        />
      </div>

      <div>
        <label
          htmlFor="accountType"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Tipo de Conta *
        </label>
        <select
          id="accountType"
          required
          value={formData.accountType}
          onChange={(e) =>
            setFormData({
              ...formData,
              accountType: e.target.value as AccountType,
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={AccountType.CHECKING}>Conta Corrente</option>
          <option value={AccountType.SAVINGS}>Poupança</option>
          <option value={AccountType.INVESTMENT}>Investimento</option>
        </select>
      </div>

      <div>
        <label className="flex items-center">
          <Input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData({ ...formData, isActive: e.target.checked })
            }
            className="h-4 w-4"
          />
          <span className="ml-2 text-sm text-gray-700">Conta Ativa</span>
        </label>
        <p className="mt-1 text-sm text-gray-500">
          Contas inativas não aparecem em seleções e relatórios
        </p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} variant="default">
          {loading ? 'Salvando...' : account ? 'Atualizar' : 'Criar'} Conta
        </Button>
        <Button
          type="button"
          onClick={() => router.push('/cadastros/contas')}
          variant="outline"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
