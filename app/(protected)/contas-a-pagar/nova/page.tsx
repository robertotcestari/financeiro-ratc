import { PayablesNav } from '../components/PayablesNav';
import { PayableForm } from '../components/PayableForm';
import { getPayablesFormData } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NovaContaAPagarPage() {
  const formData = await getPayablesFormData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto flex flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Novo título</h1>
          <p className="text-gray-600">Cadastre boleto, NF ou despesa a pagar</p>
        </div>
        <PayablesNav current="/contas-a-pagar/nova" />
        <PayableForm
          vendors={formData.vendors}
          categories={formData.categories}
          properties={formData.properties}
        />
      </div>
    </div>
  );
}
