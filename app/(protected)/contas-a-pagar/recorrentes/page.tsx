import { PayablesNav } from '../components/PayablesNav';
import { RecurrencesManager } from '../components/RecurrencesManager';
import { getPayablesFormData, listRecurrencesAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function RecorrentesPage() {
  const [recurrences, formData] = await Promise.all([
    listRecurrencesAction(),
    getPayablesFormData(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recorrentes</h1>
          <p className="text-gray-600">
            Templates mensais e anuais (condomínio, energia, IPTU, contabilidade)
          </p>
        </div>
        <PayablesNav current="/contas-a-pagar/recorrentes" />
        <RecurrencesManager
          recurrences={recurrences}
          vendors={formData.vendors}
          categories={formData.categories}
          properties={formData.properties}
        />
      </div>
    </div>
  );
}
