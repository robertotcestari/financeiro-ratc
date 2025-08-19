import { BankAccountForm } from '../components/BankAccountForm';

export default function NewBankAccountPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Nova Conta Bancária
          </h1>
          <p className="text-gray-600">
            Cadastre uma nova conta bancária no sistema
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BankAccountForm />
        </div>
      </div>
    </div>
  );
}