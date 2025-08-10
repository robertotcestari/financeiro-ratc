import { notFound } from 'next/navigation';
import { getBankAccount } from '../actions';
import { BankAccountForm } from '../components/BankAccountForm';

interface PageProps {
  params: { id: string };
}

export default async function EditBankAccountPage({ params }: PageProps) {
  const account = await getBankAccount(params.id);

  if (!account) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Editar Conta Bancária
          </h1>
          <p className="text-gray-600">
            Atualize as informações da conta bancária
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BankAccountForm account={account} />
        </div>
      </div>
    </div>
  );
}