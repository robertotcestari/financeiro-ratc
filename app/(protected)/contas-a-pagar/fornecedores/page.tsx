import { PayablesNav } from '../components/PayablesNav';
import { VendorsManager } from '../components/VendorsManager';
import { listVendorsAction, getPayablesFormData } from '../actions';

export const dynamic = 'force-dynamic';

export default async function FornecedoresPage() {
  const [vendors, formData] = await Promise.all([
    listVendorsAction(),
    getPayablesFormData(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Cadastro de favorecidos das contas a pagar</p>
        </div>
        <PayablesNav current="/contas-a-pagar/fornecedores" />
        <VendorsManager
          vendors={vendors}
          categoryOptions={formData.categories.map((category) => ({
            value: category.id,
            label: category.name,
          }))}
          propertyOptions={formData.properties.map((property) => ({
            value: property.id,
            label: property.code,
          }))}
        />
      </div>
    </div>
  );
}
