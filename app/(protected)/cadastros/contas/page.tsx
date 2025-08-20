import Link from 'next/link';
import { getBankAccounts } from './actions';
import { BankAccountList } from './components/BankAccountList';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function BankAccountsPage() {
  const accounts = await getBankAccounts();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Contas Bancárias
          </h1>
          <p className="text-gray-600">
            Gerencie as contas bancárias do sistema
          </p>
        </div>
        <Button asChild>
          <Link href="/cadastros/contas/nova">Nova Conta</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900">
            {accounts.length}
          </div>
          <div className="text-sm text-gray-600">Total de Contas</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-green-600">
            {accounts.filter((a) => a.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Contas Ativas</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-blue-600">
            {accounts
              .reduce((sum, a) => sum + a._count.transactions, 0)
              .toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total de Transações</div>
        </div>
      </div>

      <BankAccountList accounts={accounts} />
    </div>
  );
}
